import type { Context as OTELContext, Span, Tracer } from '@opentelemetry/api'
import { propagation, ROOT_CONTEXT } from '@opentelemetry/api'
import { ApolloServer } from 'apollo-server-lambda'
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
import { NewPostgresStore } from '../postgres/postgresStore'
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
import {
    ApolloServerPluginLandingPageDisabled,
    ApolloServerPluginLandingPageLocalDefault,
} from 'apollo-server-core'
import { newDeployedS3Client, newLocalS3Client } from '../s3'
import type { S3ClientT, S3BucketConfigType } from '../s3'

import {
    trace,
    SpanStatusCode,
    context as otelContext,
} from '@opentelemetry/api'

let ldClient: LDClient
let s3Client: S3ClientT

// The Context type passed to all of our GraphQL resolvers
export interface Context {
    user: UserType
    span?: Span
    tracer?: Tracer
    ctx?: OTELContext
}

// This function pulls auth info out of the cognitoAuthenticationProvider in the lambda event
// and turns that into our GQL resolver context object
function contextForRequestForFetcher(userFetcher: userFromAuthProvider): ({
    event,
}: {
    event: APIGatewayProxyEvent
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                const userId = event.requestContext.authorizer?.principalId

                let userResult
                if (authProvider && !fromThirdPartyAuthorizer) {
                    userResult = await userFetcher(authProvider, store)
                } else if (fromThirdPartyAuthorizer && userId) {
                    userResult = await userFromThirdPartyAuthorizer(
                        store,
                        userId
                    )
                }

                if (userResult === undefined) {
                    throw new Error(`Log: userResult must be supplied`)
                }
                if (!userResult.isErr()) {
                    return {
                        user: userResult.value,
                        tracer: tracer,
                        ctx: ctx,
                    }
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
        applicationEndpoint
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
        context: contextForRequest,
        plugins,
        introspection: introspectionAllowed,
    })

    const handler = server.createHandler({
        expressGetMiddlewareOptions: {
            cors: {
                origin: true,
                credentials: true,
            },
            bodyParserConfig: {
                limit: '10mb',
            },
        },
    })

    // Locally, we wrap our handler in a middleware that returns 403 for unauthenticated requests
    const isLocal = authMode === 'LOCAL'
    return isLocal ? localAuthMiddleware(handler) : handler
}

const handlerPromise = initializeGQLHandler()

const gqlHandler: Handler = async (event, context, completion) => {
    console.info('=== gqlHandler DEBUG START ===')
    console.info(`Lambda request ID: ${context.awsRequestId}`)

    // Use the same service name pattern as the existing tracer (no re-initialization needed)
    const stageName = process.env.stage
    const serviceName = 'app-api-' + stageName
    console.info(`Using service name: ${serviceName}`)

    // Debug incoming request
    console.info(`Incoming event.body type: ${typeof event.body}`)
    console.info(`Incoming event.body is null/undefined: ${event.body == null}`)
    if (event.body) {
        console.info(
            `Incoming event.body sample: ${JSON.stringify(event.body).substring(0, 200)}...`
        )
    }

    // Calculate incoming payload size
    let payloadSize = 0
    if (event.body) {
        if (typeof event.body === 'string') {
            payloadSize = Buffer.from(event.body).length
        } else if (Buffer.isBuffer(event.body)) {
            payloadSize = event.body.length
        } else {
            payloadSize = Buffer.from(JSON.stringify(event.body)).length
        }
    }
    console.info(
        `Calculated incoming payload size: ${payloadSize} bytes (${(payloadSize / 1024 / 1024).toFixed(2)} MB)`
    )

    const thresholdBytes = 5.5 * 1024 * 1024
    console.info(
        `Size threshold: ${thresholdBytes} bytes (${(thresholdBytes / 1024 / 1024).toFixed(2)} MB)`
    )

    // Check incoming payload size (before processing)
    if (payloadSize > thresholdBytes) {
        const errMsg = `Large request payload detected: ${payloadSize} bytes`
        console.warn(errMsg)
        console.info('Recording exception for large request payload...')

        // Use standard OTEL APIs for request payload monitoring
        const tracer = trace.getTracer(serviceName)
        console.info(`Standard OTEL tracer obtained: ${!!tracer}`)

        const span = tracer.startSpan('large-request-payload-detected', {
            attributes: {
                'payload.type': 'request',
                'payload.size.bytes': payloadSize,
                'payload.size.mb': parseFloat(
                    (payloadSize / 1024 / 1024).toFixed(2)
                ),
                'payload.threshold.exceeded': true,
                'service.name': serviceName,
            },
        })
        console.info(
            `Span created: ${!!span}, span ID: ${span.spanContext().spanId}`
        )

        span.recordException(new Error(errMsg))
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: errMsg,
        })
        span.end()
        console.info('Standard OTEL span ended for request payload')
    }

    // Once initialized, future awaits will return immediately
    const initializedHandler = await handlerPromise
    console.info('Handler initialized successfully')

    const response = await initializedHandler(event, context, completion)
    console.info('Handler execution completed')

    // Debug response structure
    console.info(`Response type: ${typeof response}`)
    console.info(`Response is null/undefined: ${response == null}`)
    if (response) {
        console.info(`Response keys: ${Object.keys(response)}`)
        console.info(`Response.body type: ${typeof response.body}`)
        console.info(
            `Response.body is null/undefined: ${response.body == null}`
        )
        if (response.body) {
            console.info(
                `Response.body sample: ${JSON.stringify(response.body).substring(0, 200)}...`
            )
        }
    }

    // Log response size metrics without modifying the response
    if (response && response.body) {
        console.info('Processing response body size calculation...')

        let bodySize = 0
        let sizeCalculationMethod = ''

        if (typeof response.body === 'string') {
            bodySize = Buffer.from(response.body).length
            sizeCalculationMethod = 'string -> Buffer'
        } else if (Buffer.isBuffer(response.body)) {
            bodySize = response.body.length
            sizeCalculationMethod = 'Buffer.length'
        } else if (response.body !== null && response.body !== undefined) {
            // For objects, measure the JSON string size
            const jsonString = JSON.stringify(response.body)
            bodySize = Buffer.from(jsonString).length
            sizeCalculationMethod = 'object -> JSON.stringify -> Buffer'
            console.info(`JSON string length: ${jsonString.length} chars`)
        }

        console.info(
            `Response size calculation method: ${sizeCalculationMethod}`
        )
        console.info(
            `Calculated response size: ${bodySize} bytes (${(bodySize / 1024 / 1024).toFixed(2)} MB)`
        )

        const thresholdBytes = 5.5 * 1024 * 1024
        console.info(
            `Response size threshold: ${thresholdBytes} bytes (${(thresholdBytes / 1024 / 1024).toFixed(2)} MB)`
        )
        console.info(`Response exceeds threshold: ${bodySize > thresholdBytes}`)

        if (bodySize > thresholdBytes) {
            const errMsg = `Large response detected: ${bodySize} bytes`
            console.warn(errMsg)
            console.info('Recording exception for large response payload...')

            console.info('Checking OTEL state...')
            const activeContext = otelContext.active()
            console.info(`Active context exists: ${!!activeContext}`)
            console.info(
                `Global tracer provider: ${!!trace.getTracerProvider()}`
            )

            const tracer = trace.getTracer(serviceName)
            console.info(`Standard OTEL tracer obtained: ${!!tracer}`)
            console.info(`Tracer constructor name: ${tracer.constructor.name}`)

            // Try getting the active span first
            const activeSpan = trace.getActiveSpan()
            console.info(`Active span exists: ${!!activeSpan}`)
            if (activeSpan) {
                console.info(
                    `Active span ID: ${activeSpan.spanContext().spanId}`
                )
                console.info(
                    `Active span trace ID: ${activeSpan.spanContext().traceId}`
                )
                console.info(
                    `Active span is recording: ${activeSpan.isRecording()}`
                )
            }

            const span = tracer.startSpan('large-response-payload-detected', {
                attributes: {
                    'payload.type': 'response',
                    'payload.size.bytes': bodySize,
                    'payload.size.mb': parseFloat(
                        (bodySize / 1024 / 1024).toFixed(2)
                    ),
                    'payload.threshold.exceeded': true,
                    'service.name': serviceName,
                },
            })
            console.info(`Span created: ${!!span}`)
            console.info(`Span context: ${JSON.stringify(span.spanContext())}`)
            console.info(`Span is recording: ${span.isRecording()}`)
            console.info(`Span constructor name: ${span.constructor.name}`)

            // If we have an active span, try creating a child span instead
            if (activeSpan && activeSpan.isRecording()) {
                console.info('Creating child span from active span...')
                const activeSpanContext = otelContext.active()
                const childSpan = tracer.startSpan(
                    'large-response-payload-detected',
                    {
                        attributes: {
                            'payload.type': 'response',
                            'payload.size.bytes': bodySize,
                            'payload.size.mb': parseFloat(
                                (bodySize / 1024 / 1024).toFixed(2)
                            ),
                            'payload.threshold.exceeded': true,
                        },
                    },
                    activeSpanContext
                )
                console.info(`Child span ID: ${childSpan.spanContext().spanId}`)
                console.info(
                    `Child span is recording: ${childSpan.isRecording()}`
                )

                if (childSpan.isRecording()) {
                    childSpan.recordException(new Error(errMsg))
                    childSpan.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: errMsg,
                    })
                    childSpan.end()
                    console.info('Child span successfully recorded')
                } else {
                    console.warn('Child span is not recording')
                }
            }

            span.recordException(new Error(errMsg))
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: errMsg,
            })
            span.end()
            console.info('Standard OTEL span ended for response payload')
        }
    } else {
        console.warn('No response body found to measure')
        console.info(`Response exists: ${!!response}`)
        if (response) {
            console.info(`Response.body exists: ${!!response.body}`)
        }
    }

    console.info('=== gqlHandler DEBUG END ===')
    return response
}
module.exports = { gqlHandler }
