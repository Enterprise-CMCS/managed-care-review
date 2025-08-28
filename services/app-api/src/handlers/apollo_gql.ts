import type { Context as OTELContext, Span, Tracer } from '@opentelemetry/api'
import { propagation, ROOT_CONTEXT } from '@opentelemetry/api'
import { ApolloServer } from '@apollo/server'
import type { middleware } from '@as-integrations/aws-lambda'
import {
    startServerAndCreateLambdaHandler,
    handlers,
} from '@as-integrations/aws-lambda'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import type {
    APIGatewayProxyEvent,
    APIGatewayProxyHandler,
    Handler,
} from 'aws-lambda'

import typeDefs from '../../../app-graphql/src/schema.graphql'
import { assertIsAuthMode } from '@mc-review/common-code'
import type { UserType } from '../domain-models'
import type { userFromAuthProvider } from '../authn'
import {
    userFromCognitoAuthProvider,
    userFromLocalAuthProvider,
    userFromThirdPartyAuthorizer,
} from '../authn'
import { NewPostgresStore } from '../postgres'
import { configureResolvers } from '../resolvers'
import { configurePostgres, configureEmailer } from './configuration'
import { createTracer } from '../otel/otel_handler'
import {
    newAWSEmailParameterStore,
    newLocalEmailParameterStore,
} from '../parameterStore'
import type { LDService } from '../launchDarkly/launchDarkly'
import { ldService, offlineLDService } from '../launchDarkly/launchDarkly'
import type { LDClient } from '@launchdarkly/node-server-sdk'
import * as ld from '@launchdarkly/node-server-sdk'
import { newJWTLib } from '../jwt'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { newDeployedS3Client, newLocalS3Client } from '../s3'
import type { S3ClientT, S3BucketConfigType } from '../s3'
import {
    documentZipService,
    generateDocumentZip,
    localGenerateDocumentZip,
} from '../zip'
import { logError } from '../logger'
import { configureCorsHeaders } from '../cors/configureCorsHelpers'

let ldClient: LDClient
let s3Client: S3ClientT

// The Context type passed to all of our GraphQL resolvers
export interface Context {
    user: UserType
    span?: Span
    tracer?: Tracer
    ctx?: OTELContext
    oauthClient?: {
        clientId: string
        grants: string[]
        isOAuthClient: boolean
    }
}

// This function pulls auth info out of the cognitoAuthenticationProvider in the lambda event
// and turns that into our GQL resolver context object
function contextForRequestForFetcher(
    userFetcher: userFromAuthProvider
): ({
    event,
}: {
    event: APIGatewayProxyEvent
    context: any
}) => Promise<Context> {
    return async ({ event, context }) => {
        // pull the current span out of the LAMBDA context, to place it in the APOLLO context
        const stageName = process.env.stage
        const tracer = createTracer('app-api-' + stageName)
        const ctx = propagation.extract(ROOT_CONTEXT, event.headers)

        const authProvider =
            event.requestContext.identity.cognitoAuthenticationProvider
        // This handler is shared with the third_party_API_authorizer
        // when called from the 3rd party authorizer the cognito auth provider
        // is not valid for instead the authorizer returns a user ID
        // that is used to fetch the user
        const fromThirdPartyAuthorizer = event.requestContext.path.includes(
            '/v1/graphql/external'
        )

        if (authProvider || fromThirdPartyAuthorizer) {
            try {
                const dbURL = process.env.DATABASE_URL ?? ''
                const secretsManagerSecret =
                    process.env.SECRETS_MANAGER_SECRET ?? ''

                const pgResult = await configurePostgres(
                    dbURL,
                    secretsManagerSecret
                )
                if (pgResult instanceof Error) {
                    console.error("Init Error: Postgres couldn't be configured")
                    throw pgResult
                }

                const store = NewPostgresStore(pgResult)
                const principalId = event.requestContext.authorizer?.principalId
                const authorizerContext = event.requestContext.authorizer

                // Extract OAuth context if present
                const isOAuthClient =
                    authorizerContext?.isOAuthClient === 'true'
                const oauthClientId = authorizerContext?.clientId
                const oauthGrants = authorizerContext?.grants?.split(',') || []

                let userResult
                if (authProvider && !fromThirdPartyAuthorizer) {
                    userResult = await userFetcher(authProvider, store)
                } else if (fromThirdPartyAuthorizer && principalId) {
                    // principalId is now always the user ID for both OAuth and regular tokens
                    userResult = await userFromThirdPartyAuthorizer(
                        store,
                        principalId
                    )
                }

                if (userResult === undefined) {
                    throw new Error(`Log: userResult must be supplied`)
                }
                if (!userResult.isErr()) {
                    const context: Context = {
                        user: userResult.value,
                        tracer: tracer,
                        ctx: ctx,
                    }

                    // Add OAuth client info if present
                    if (isOAuthClient && oauthClientId) {
                        context.oauthClient = {
                            clientId: oauthClientId,
                            grants: oauthGrants,
                            isOAuthClient: true,
                        }
                    }

                    return context
                } else {
                    throw new Error(
                        `Log: failed to fetch user: ${userResult.error}`
                    )
                }
            } catch (err) {
                console.error('Error attempting to fetch user: ', err)
                throw new Error(
                    `Log: placing user in gql context failed, ${err}`
                )
            }
        } else {
            throw new Error('Log: no AuthProvider from an internal API user.')
        }
    }
}

const requestHandler = handlers.createAPIGatewayProxyEventRequestHandler()

const corsMiddleware: middleware.MiddlewareFn<typeof requestHandler> = async (
    event
) => {
    return async (result) => {
        const corsError = configureCorsHeaders(result, event)

        if (corsError) {
            logError('configureCorsHeaders', corsError.message)
        }
    }
}

// This middleware returns an error if the local request is missing authentication info
function localAuthMiddleware(wrapped: APIGatewayProxyHandler): Handler {
    return async function (event, context, completion) {
        const userHeader =
            event.requestContext.identity.cognitoAuthenticationProvider

        if (userHeader === 'NO_USER') {
            console.info('NO_USER info set, returning 403')
            return Promise.resolve({
                statusCode: 403,
                body: '{ "error": "No User Sent in cognitoAuthenticationProvider header"}\n',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            })
        }

        const result = await wrapped(event, context, completion)

        return result
    }
}

// This asynchronous function is started on the cold-load of this script
// and is awaited by our handler function
// Pattern is explained here https://serverlessfirst.com/function-initialisation/
async function initializeGQLHandler(): Promise<Handler> {
    // Initializing our handler should be the only place we read environment variables. Everything
    // should be configured by parameters, per /docs/designPatterns.md#Dependency_Injection

    const authMode = process.env.VITE_APP_AUTH_MODE
    assertIsAuthMode(authMode)

    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const dbURL = process.env.DATABASE_URL
    const stageName = process.env.stage
    const applicationEndpoint = process.env.APPLICATION_ENDPOINT
    const emailerMode = process.env.EMAILER_MODE
    const otelCollectorUrl = process.env.API_APP_OTEL_COLLECTOR_URL
    const parameterStoreMode = process.env.PARAMETER_STORE_MODE
    const ldSDKKey = process.env.LD_SDK_KEY
    const jwtSecret = process.env.JWT_SECRET
    const s3DocumentsBucket = process.env.VITE_APP_S3_DOCUMENTS_BUCKET
    const s3QABucket = process.env.VITE_APP_S3_QA_BUCKET
    const region = process.env.REGION
    // START Assert configuration is valid
    if (emailerMode !== 'LOCAL' && emailerMode !== 'SES')
        throw new Error(
            'Configuration Error: EMAILER_MODE is not valid. Current value: ' +
                emailerMode
        )

    if (applicationEndpoint === undefined || applicationEndpoint === '')
        throw new Error('Configuration Error: APPLICATION_ENDPOINT is required')

    if (stageName === undefined)
        throw new Error('Configuration Error: stage is required')

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }

    if (otelCollectorUrl === undefined || otelCollectorUrl === '') {
        throw new Error(
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL is required to run app-api'
        )
    }

    if (parameterStoreMode !== 'LOCAL' && parameterStoreMode !== 'AWS') {
        throw new Error(
            'Configuration Error: PARAMETER_STORE_MODE is not valid. Current value: ' +
                parameterStoreMode
        )
    }
    if (ldSDKKey === undefined || ldSDKKey === '') {
        throw new Error(
            'Configuration Error: LD_SDK_KEY is required to run app-api.'
        )
    }

    if (jwtSecret === undefined || jwtSecret === '') {
        throw new Error(
            'Configuration Error: JWT_SECRET is required to run app-api.'
        )
    }

    if (s3DocumentsBucket === undefined || s3QABucket === undefined) {
        throw new Error(
            'To configure s3, you  must set VITE_APP_S3_DOCUMENTS_BUCKET and VITE_APP_S3_QA_BUCKET'
        )
    }

    if (region === undefined) {
        throw new Error('Configuration error: region is required')
    }

    // END

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error("Init Error: Postgres couldn't be configured")
        throw pgResult
    }

    const store = NewPostgresStore(pgResult)

    // Configure LaunchDarkly
    const ldOptions: ld.LDOptions = {
        streamUri: 'https://stream.launchdarkly.us',
        baseUri: 'https://app.launchdarkly.us',
        eventsUri: 'https://events.launchdarkly.us',
    }
    ldClient = ld.init(ldSDKKey, ldOptions)
    let launchDarkly: LDService

    // Wait for initialization. On initialization failure default to offlineLDService and close ldClient.
    try {
        await ldClient.waitForInitialization({ timeout: 10 })
        launchDarkly = ldService(ldClient)
    } catch (err) {
        console.error(
            `LaunchDarkly Error: ${err.message} Falling back to LaunchDarkly offline service.`
        )
        ldClient.close()
        launchDarkly = offlineLDService()
    }

    // Configure Apollo sandbox plugin
    let plugins = []
    let introspectionAllowed = false // sets if we allow introspection queries
    if (stageName === 'prod' || stageName === 'val') {
        plugins = [ApolloServerPluginLandingPageDisabled()]
    } else {
        plugins = [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
        introspectionAllowed = true
    }

    // Hard coding this for now, next job is to run this config to this app.
    const jwtLib = newJWTLib({
        issuer: `mcreview-${stageName}`,
        signingKey: Buffer.from(jwtSecret, 'hex'),
        expirationDurationS: 90 * 24 * 60 * 60, // 90 days
    })

    //Configure email parameter store.
    const emailParameterStore =
        parameterStoreMode === 'LOCAL'
            ? newLocalEmailParameterStore()
            : newAWSEmailParameterStore()

    const emailer = await configureEmailer({
        emailParameterStore,
        store,
        ldService: launchDarkly,
        stageName,
        emailerMode,
        applicationEndpoint,
    })

    if (emailer instanceof Error) {
        const error = `Email Configuration error: ${emailer.message}`
        console.error(error)
        throw emailer
    }

    const S3_BUCKETS_CONFIG: S3BucketConfigType = {
        HEALTH_PLAN_DOCS: s3DocumentsBucket,
        QUESTION_ANSWER_DOCS: s3QABucket,
    }

    const s3Local = 'http://localhost:4569'
    if (authMode === 'LOCAL') {
        s3Client = newLocalS3Client(s3Local, S3_BUCKETS_CONFIG)
    } else {
        s3Client = newDeployedS3Client(S3_BUCKETS_CONFIG, region)
    }

    // Service for zipping documents
    const generateDocZip =
        authMode === 'LOCAL' ? localGenerateDocumentZip : generateDocumentZip
    const documentZip = documentZipService(store, generateDocZip)

    // Print out all the variables we've been configured with. Leave sensitive ones out, please.
    console.info('Running With Config: ', {
        authMode,
        stageName,
        dbURL,
        applicationEndpoint,
        emailSource: emailer.config.emailSource,
        emailerMode,
        otelCollectorUrl,
        parameterStoreMode,
    })

    // Resolvers are defined and tested in the resolvers package
    const resolvers = configureResolvers(
        store,
        emailer,
        launchDarkly,
        jwtLib,
        s3Client,
        applicationEndpoint,
        documentZip
    )

    const userFetcher =
        authMode === 'LOCAL'
            ? userFromLocalAuthProvider
            : userFromCognitoAuthProvider

    // Our user-context function is parametrized with a local or
    const contextForRequest = contextForRequestForFetcher(userFetcher)

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        plugins,
        introspection: introspectionAllowed,
    })

    const handler = startServerAndCreateLambdaHandler(server, requestHandler, {
        context: async ({ event, context }) => {
            return await contextForRequest({ event, context })
        },
        middleware: [corsMiddleware],
    })

    // Locally, we wrap our handler in a middleware that returns 403 for unauthenticated requests
    const isLocal = authMode === 'LOCAL'
    return isLocal ? localAuthMiddleware(handler) : handler
}

const handlerPromise = initializeGQLHandler()

const gqlHandler: Handler = async (event, context, completion) => {
    // Once initialized, future awaits will return immediately
    const initializedHandler = await handlerPromise

    const otelCollectorUrl = process.env.API_APP_OTEL_COLLECTOR_URL
    if (otelCollectorUrl === undefined || otelCollectorUrl === '') {
        throw new Error(
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL is required to run app-api'
        )
    }
    const serviceName = 'gql-handler'
    initTracer(serviceName, otelCollectorUrl)

    const response = await initializedHandler(event, context, completion)
    const payloadSize = Buffer.from(event.body).length
    if (payloadSize > 5.5 * 1024 * 1024) {
        const errMsg = `Large request payload detected: ${payloadSize} bytes`
        console.warn(errMsg)
        recordException(errMsg, serviceName, 'requestPayload')
    }
    // Log response size metrics without modifying the response
    if (response && response.body) {
        const bodySize = Buffer.from(response.body).length
        console.info(`Response size: ${bodySize} bytes`)
        if (bodySize > 5.5 * 1024 * 1024) {
            const errMsg = `Large response detected: ${bodySize} bytes`
            console.warn(errMsg)
            recordException(errMsg, serviceName, 'responsePayload')
        }
    }

    return response
}

module.exports = { gqlHandler }
