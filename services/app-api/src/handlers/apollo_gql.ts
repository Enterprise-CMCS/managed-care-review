import type { Context as OTELContext, Span, Tracer } from '@opentelemetry/api'
import {
    propagation,
    ROOT_CONTEXT,
    trace,
    SpanStatusCode,
    context as otelContext,
} from '@opentelemetry/api'
import { ApolloServer } from '@apollo/server'
import type { middleware } from '@as-integrations/aws-lambda'
import {
    startServerAndCreateLambdaHandler,
    handlers,
} from '@as-integrations/aws-lambda'
import {
    initTracer,
    recordException,
    recordSpanEvent,
    flushTracer,
} from '../otel/otel_handler'
import type { APIGatewayProxyEvent, Handler } from 'aws-lambda'

import typeDefs from '../../../app-graphql/src/schema.graphql'
import { assertIsAuthMode } from '@mc-review/common-code'
import type { UserType } from '../domain-models'
import type { userFromAuthProvider } from '../authn'
import {
    userFromCognitoAuthProvider,
    userFromLocalAuthProvider,
    userFromThirdPartyAuthorizer,
} from '../authn'
import type { Store } from '../postgres'
import { NewPostgresStore } from '../postgres'
import { parseErrorToError, serializeError } from '@mc-review/helpers'
import { configureResolvers } from '../resolvers'
import { configurePostgres, configureEmailer } from './configuration'
import {
    newAWSEmailParameterStore,
    newLocalEmailParameterStore,
} from '../parameterStore'
import type { LDService } from '../launchDarkly/launchDarkly'
import {
    ldService,
    offlineLDService,
    localLDService,
} from '../launchDarkly/launchDarkly'
import type { LDClient } from '@launchdarkly/node-server-sdk'
import * as ld from '@launchdarkly/node-server-sdk'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { newDeployedS3Client, newLocalS3Client } from '../s3'
import type { S3ClientT, S3BucketConfigType } from '../s3'
import {
    documentZipService,
    generateDocumentZip,
    localGenerateDocumentZip,
} from '../zip'
import { configureCorsHeaders } from '../cors/configureCorsHelpers'
import { logError } from '../logger'
import { OAuthScope } from '../generated/enums'

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
        iss: string
        grants: string[]
        scopes: string[]
        isDelegatedUser: boolean
    }
}

// Extract the GraphQL operation name from the request body for log correlation.
// Returns undefined for anonymous queries, batched requests we can't parse, or malformed bodies.
function extractOperationName(event: APIGatewayProxyEvent): string | undefined {
    if (!event.body) return undefined
    try {
        const raw = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf-8')
            : event.body
        const parsed = JSON.parse(raw)
        const op = Array.isArray(parsed) ? parsed[0] : parsed
        return typeof op?.operationName === 'string'
            ? op.operationName
            : undefined
    } catch {
        return undefined
    }
}

// OAuth/server-to-server clients typically omit the `operationName` JSON field
// and send only the raw `query` string, so parse the name out of the query body.
function extractOAuthOperationName(
    event: APIGatewayProxyEvent
): string | undefined {
    if (!event.body) return undefined
    try {
        const raw = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf-8')
            : event.body
        const parsed = JSON.parse(raw)
        const op = Array.isArray(parsed) ? parsed[0] : parsed
        if (typeof op?.query !== 'string') return undefined
        const match = /\b(?:query|mutation|subscription)\s+(\w+)/.exec(op.query)
        return match?.[1]
    } catch {
        return undefined
    }
}

// This function pulls auth info out of the cognitoAuthenticationProvider in the lambda event
// and turns that into our GQL resolver context object
function contextForRequestForFetcher(
    store: Store,
    userFetcher: userFromAuthProvider
): ({
    event,
}: {
    event: APIGatewayProxyEvent
    context: any
}) => Promise<Context> {
    return async ({ event, context }) => {
        // Get the already-initialized tracer (initialized during cold start)
        const stageName = process.env.stage
        const tracer = trace.getTracer('app-api-' + stageName)

        // Extract trace context from frontend headers for distributed tracing
        // This allows backend spans to be children of frontend spans
        const parentContext = propagation.extract(ROOT_CONTEXT, event.headers)

        // Create a span for this GraphQL request as a child of the frontend trace
        const requestSpan = tracer.startSpan(
            'graphql.request',
            {
                attributes: {
                    'http.method': event.httpMethod,
                    'http.url': event.path,
                    'http.route': event.requestContext.resourcePath,
                },
            },
            parentContext // Use the extracted context as the parent
        )

        // Make requestSpan the active span for all downstream operations
        // This ensures all child spans (Prisma, secrets, etc.) are properly linked
        return otelContext.with(
            trace.setSpan(parentContext, requestSpan),
            async () => {
                const authProvider =
                    event.requestContext.identity.cognitoAuthenticationProvider
                // This handler is shared with the third_party_API_authorizer
                // when called from the 3rd party authorizer the cognito auth provider
                // is not valid for instead the authorizer returns a user ID
                // that is used to fetch the user
                const fromThirdPartyAuthorizer =
                    event.requestContext.path.includes('/v1/graphql/external')

                if (!authProvider && !fromThirdPartyAuthorizer) {
                    throw new Error(
                        'Log: no AuthProvider from an internal API user.'
                    )
                }

                if (fromThirdPartyAuthorizer) {
                    const principalId =
                        event.requestContext.authorizer?.principalId
                    const authorizerContext = event.requestContext.authorizer
                    const delegatedUser: string | null =
                        event.headers?.['x-acting-as-user'] ??
                        event.headers?.['X-Acting-As-User'] ??
                        null

                    // Extract OAuth context if present
                    const oauthClientId = authorizerContext?.clientId
                    const tokenIssuer = authorizerContext?.iss
                    const oauthGrants =
                        authorizerContext?.grants?.split(',') || []

                    // oauth client data
                    const oauthClient: Context['oauthClient'] = {
                        clientId: oauthClientId,
                        iss: tokenIssuer,
                        grants: oauthGrants,
                        scopes: [], // leave this empty until fetch and validation
                        isDelegatedUser: !!delegatedUser,
                    }

                    // extra context for logging
                    const oauthContext = {
                        operation: 'contextForRequestForFetcher',
                        authMethod: 'OAuth 2.0',
                        principalId,
                        path: event.path,
                        requestId: event.requestContext.requestId,
                        queryName: extractOAuthOperationName(event),
                        ['x-acting-as-user']: delegatedUser,
                    }

                    // Record a span for every delegated (impersonation) request,
                    // independent of whether it ultimately succeeds or fails,
                    // so request volume can be tracked for anomaly detection.
                    if (delegatedUser) {
                        recordSpanEvent(
                            'app-api-' + stageName,
                            'delegatedUserRequest',
                            {
                                'oauth.client_id': oauthClientId ?? 'unknown',
                                'oauth.acting_as_user': delegatedUser,
                            }
                        )
                    }

                    const storedOauthClient =
                        await store.getOAuthClientByClientId(oauthClientId)

                    if (storedOauthClient instanceof Error) {
                        console.error({
                            message: `Failed to fetch OAuth client. ${storedOauthClient.message}`,
                            error: serializeError(storedOauthClient),
                            ...oauthContext,
                            ...oauthClient,
                        })
                        throw new Error(
                            `Failed to fetch OAuth client. ${storedOauthClient.message}`
                        )
                    }

                    if (!storedOauthClient) {
                        console.error({
                            message: `OAuth client not found`,
                            ...oauthContext,
                            ...oauthClient,
                        })
                        throw new Error('OAuth client not found')
                    }

                    // set scopes after validation
                    oauthClient.scopes = storedOauthClient.scopes.map(
                        (scope) => scope
                    )

                    // check if client is authorized for delegated requests
                    if (
                        !oauthClient?.scopes?.includes(
                            OAuthScope.CMS_SUBMISSION_ACTIONS
                        ) &&
                        delegatedUser
                    ) {
                        const errMsg =
                            'Client is not authorized to make delegated requests'
                        console.error({
                            message: errMsg,
                            ...oauthContext,
                            ...oauthClient,
                        })
                        recordException(
                            errMsg,
                            'app-api-' + stageName,
                            'delegatedUserAuth'
                        )
                        throw new Error(errMsg)
                    }

                    // Get user data
                    const userResult = await userFromThirdPartyAuthorizer(
                        store,
                        principalId,
                        delegatedUser
                    )

                    if (userResult instanceof Error) {
                        console.error({
                            message: `Failed to fetch user from OAuth client. ${userResult.message}`,
                            error: serializeError(userResult),
                            ...oauthContext,
                            ...oauthClient,
                        })
                        throw new Error(userResult.message)
                    }

                    console.info({
                        message: 'OAuth client context fetch successful',
                        ...oauthContext,
                        ...oauthClient,
                    })

                    return {
                        user: userResult,
                        tracer: tracer,
                        ctx: parentContext,
                        span: requestSpan,
                        oauthClient,
                    }
                } else {
                    const userResult = await userFetcher(authProvider!, store)
                    const cognitoContext = {
                        operation: 'contextForRequestForFetcher',
                        authMethod: 'Cognito',
                        path: event.path,
                        requestId: event.requestContext.requestId,
                        queryName: extractOperationName(event),
                    }

                    if (userResult === undefined) {
                        console.error({
                            message: 'User not found',
                            ...cognitoContext,
                        })
                        throw new Error(`User not found.`)
                    }

                    if (userResult instanceof Error) {
                        console.error({
                            message: `Error fetching user: ${userResult.message}`,
                            error: serializeError(userResult),
                            ...cognitoContext,
                        })
                        throw new Error(
                            `Error fetching user: ${userResult.message}`
                        )
                    }

                    console.info({
                        message: 'Cognito client context fetch successful',
                        userId: userResult.id,
                        ...cognitoContext,
                    })

                    const context: Context = {
                        user: userResult,
                        tracer: tracer,
                        ctx: parentContext,
                        span: requestSpan,
                    }

                    return context
                }
            }
        )
    }
}

const requestHandler = handlers.createAPIGatewayProxyEventRequestHandler()

const corsMiddleware: middleware.MiddlewareFn<typeof requestHandler> = async (
    event
) => {
    return async (result) => {
        const errors = configureCorsHeaders(result, event)
        if (errors) {
            logError('configureCorsHeaders', errors.message)
        }
    }
}

// This middleware returns an error if the local request is missing authentication info
const localAuthMiddleware: middleware.MiddlewareFn<
    typeof requestHandler
> = async (event) => {
    const userHeader =
        event.requestContext.identity.cognitoAuthenticationProvider

    if (
        userHeader === 'NO_USER' &&
        process.env.VITE_APP_AUTH_MODE === 'LOCAL'
    ) {
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
    const parameterStoreMode = process.env.PARAMETER_STORE_MODE
    const ldSDKKey = process.env.LD_SDK_KEY
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

    if (s3DocumentsBucket === undefined || s3QABucket === undefined) {
        throw new Error(
            'To configure s3, you  must set VITE_APP_S3_DOCUMENTS_BUCKET and VITE_APP_S3_QA_BUCKET'
        )
    }

    if (region === undefined) {
        throw new Error('Configuration error: region is required')
    }

    // END

    // Initialize OpenTelemetry tracing once during cold start
    // This prevents duplicate provider registrations on every request
    initTracer('app-api-' + stageName)
    console.info('OpenTelemetry tracer initialized for app-api-' + stageName)

    const pgResult = await configurePostgres(
        dbURL,
        secretsManagerSecret,
        stageName
    )
    if (pgResult instanceof Error) {
        console.error("Init Error: Postgres couldn't be configured")
        throw pgResult
    }

    const store = NewPostgresStore(pgResult)

    // Configure LaunchDarkly
    let launchDarkly: LDService

    if (authMode === 'LOCAL') {
        // Configure for local LD service if configured. Visit the UI using http://localhost:3031/
        const launchDarklyLocalHost = process.env.LOCAL_DEV_SERVICE_URL
        launchDarkly = launchDarklyLocalHost
            ? localLDService(launchDarklyLocalHost)
            : offlineLDService()
    } else {
        const ldOptions: ld.LDOptions = {
            streamUri: 'https://stream.launchdarkly.us',
            baseUri: 'https://app.launchdarkly.us',
            eventsUri: 'https://events.launchdarkly.us',
        }
        ldClient = ld.init(ldSDKKey, ldOptions)

        // Wait for initialization. On initialization failure default to offlineLDService and close ldClient.
        try {
            await ldClient.waitForInitialization({ timeout: 10 })
            launchDarkly = ldService(ldClient)
        } catch (err) {
            console.error(
                `LaunchDarkly Error: ${parseErrorToError(err).message} Falling back to LaunchDarkly offline service.`
            )
            ldClient.close()
            launchDarkly = offlineLDService()
        }
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

    // Add OpenTelemetry plugin to manage request span lifecycle
    const otelPlugin = {
        async requestDidStart() {
            return {
                async willSendResponse(requestContext: any) {
                    const { span } = requestContext.contextValue
                    if (span) {
                        // Set span status based on errors
                        if (
                            requestContext.errors &&
                            requestContext.errors.length > 0
                        ) {
                            span.setStatus({
                                code: SpanStatusCode.ERROR,
                                message: requestContext.errors[0].message,
                            })
                            requestContext.errors.forEach((error: Error) => {
                                span.recordException(error)
                            })
                        } else {
                            span.setStatus({ code: SpanStatusCode.OK })
                        }
                        span.end()
                    }
                },
            }
        },
    }
    plugins.push(otelPlugin)

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

    const s3Local = 'http://localhost:4566'
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
    const config = {
        authMode,
        stageName,
        dbURL,
        applicationEndpoint,
        emailSource: emailer.config.emailSource,
        emailerMode,
        parameterStoreMode,
    }

    if (authMode === 'LOCAL') {
        Object.assign(config, {
            localDevServiceUrl: process.env.LOCAL_DEV_SERVICE_URL,
        })
    }

    console.info('Running With Config: ', config)

    // Resolvers are defined and tested in the resolvers package
    const resolvers = configureResolvers(
        store,
        emailer,
        launchDarkly,
        s3Client,
        applicationEndpoint,
        documentZip
    )

    const userFetcher =
        authMode === 'LOCAL'
            ? userFromLocalAuthProvider
            : userFromCognitoAuthProvider

    // Our user-context function is parametrized with a local or
    const contextForRequest = contextForRequestForFetcher(store, userFetcher)

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        plugins,
        introspection: introspectionAllowed,
    })

    return startServerAndCreateLambdaHandler(server, requestHandler, {
        context: async ({ event, context }) => {
            return await contextForRequest({ event, context })
        },
        middleware: [corsMiddleware, localAuthMiddleware],
    })
}

const handlerPromise = initializeGQLHandler()

const gqlHandler: Handler = async (event, context) => {
    // Once initialized, future awaits will return immediately
    const initializedHandler = await handlerPromise
    const serviceName = 'gql-handler'

    // Call handler async-style (Node.js 24 pattern) - callback param unused
    const response = await initializedHandler(event, context, () => {})
    // Flush spans before Lambda freezes — BatchSpanProcessor timer won't fire after handler returns
    // Swallow flush errors so telemetry failures never affect API responses
    try {
        await flushTracer()
    } catch (flushErr) {
        console.warn('otel: flush failed', flushErr)
    }
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

export { gqlHandler }
