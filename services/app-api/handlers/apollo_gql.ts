import { propagation, ROOT_CONTEXT, Span } from '@opentelemetry/api'
import { ApolloServer } from 'apollo-server-lambda'
import {
    APIGatewayProxyEvent,
    APIGatewayProxyHandler,
    Handler,
} from 'aws-lambda'
import typeDefs from '../../app-graphql/src/schema.graphql'
import {
    assertIsAuthMode,
    CognitoUserType,
} from '../../app-web/src/common-code/domain-models'
import {
    userFromAuthProvider,
    userFromCognitoAuthProvider,
    userFromLocalAuthProvider,
} from '../authn'
import { newLocalEmailer, newSESEmailer } from '../emailer'
import { NewPostgresStore } from '../postgres/postgresStore'
import { configureResolvers } from '../resolvers'
import { configurePostgres } from './configuration'
import { tracer as tracer } from '../../otel/otel_handler'

const requestSpanKey = 'REQUEST_SPAN'

// The Context type passed to all of our GraphQL resolvers
export interface Context {
    user: CognitoUserType
    span?: Span
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
        const anyContext = context as any
        const requestSpan = anyContext[requestSpanKey]

        const authProvider =
            event.requestContext.identity.cognitoAuthenticationProvider
        if (authProvider) {
            try {
                const userResult = await userFetcher(authProvider)

                if (!userResult.isErr()) {
                    return {
                        user: userResult.value,
                        span: requestSpan,
                    }
                } else {
                    throw new Error(
                        `Log: failed to fetch user: ${userResult.error}`
                    )
                }
            } catch (err) {
                console.error('Error attempting to fetch user: ', err)
                throw new Error('Log: placing user in gql context failed')
            }
        } else {
            throw new Error('Log: no AuthProvider')
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

// Tracing Middleware
function tracingMiddleware(wrapped: Handler): Handler {
    return async function (event, context, completion) {
        // get the parent context from headers
        console.log(event.headers)
        const ctx = propagation.extract(ROOT_CONTEXT, event.headers)
        const span = tracer.startSpan(
            'handleRequest',
            {
                kind: 1, // server
                attributes: { middlewareInit: true },
            },
            ctx
        )

        // Put the span into the LAMBDA context, in order to pass it into the APOLLO context in contextForRequestForFetcher
        // We have to use any here because this context's type is not under our control.
        const anyContext = context as any
        anyContext[requestSpanKey] = span

        const result = await wrapped(event, context, completion)

        span.end()

        return result
    }
}

// This asynchronous function is started on the cold-load of this script
// and is awaited by our handler function
// Pattern is explained here https://serverlessfirst.com/function-initialisation/
async function initializeGQLHandler(): Promise<Handler> {
    // Initializing our handler should be the only place we read environment variables. Everything
    // should be configured by parameters, per /docs/designPatterns.md#Dependency_Injection

    const authMode = process.env.REACT_APP_AUTH_MODE
    assertIsAuthMode(authMode)

    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const dbURL = process.env.DATABASE_URL
    const stageName = process.env.stage
    const applicationEndpoint = process.env.APPLICATION_ENDPOINT
    const emailSource = process.env.SES_SOURCE_EMAIL_ADDRESS
    const emailerMode = process.env.EMAILER_MODE
    const cmsReviewSharedEmails = process.env.SES_REVIEW_TEAM_EMAIL_ADDRESSES

    // Print out all the variables we've been configured with. Leave sensitive ones out, please.
    console.info('Running With Config: ', {
        authMode,
        stageName,
        dbURL,
        applicationEndpoint,
        emailSource,
        emailerMode,
    })

    // START Assert configuration is valid
    if (emailerMode !== 'LOCAL' && emailerMode !== 'SES')
        throw new Error(
            'Configuration Error: EMAILER_MODE is not valid. Current value: ' +
                emailerMode
        )

    if (emailSource === undefined)
        throw new Error(
            'Configuration Error: SES_SOURCE_EMAIL_ADDRESS is required'
        )

    if (cmsReviewSharedEmails === undefined)
        throw new Error(
            'Configuration Error: SES_REVIEW_TEAM_EMAIL_ADDRESSES is required'
        )

    if (applicationEndpoint === undefined || applicationEndpoint === '')
        throw new Error('Configuration Error: APPLICATION_ENDPOINT is required')

    if (stageName === undefined)
        throw new Error('Configuration Error: stage is required')

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }
    // END

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error("Init Error: Postgres couldn't be configured")
        throw pgResult
    }

    const store = NewPostgresStore(pgResult)

    const emailer =
        emailerMode == 'LOCAL'
            ? newLocalEmailer({
                  emailSource: 'local@example.com',
                  stage: 'local',
                  baseUrl: applicationEndpoint,
                  cmsReviewSharedEmails: cmsReviewSharedEmails.split(','),
              })
            : newSESEmailer({
                  emailSource: emailSource,
                  stage: stageName,
                  baseUrl: applicationEndpoint,
                  cmsReviewSharedEmails: cmsReviewSharedEmails.split(','),
              })

    // Resolvers are defined and tested in the resolvers package
    const resolvers = configureResolvers(store, emailer)

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
    })

    const handler = server.createHandler({
        expressGetMiddlewareOptions: {
            cors: {
                origin: true,
                credentials: true,
            },
        },
    })

    const tracingHandler = tracingMiddleware(handler)

    // Locally, we wrap our handler in a middleware that returns 403 for unauthenticated requests
    const isLocal = authMode === 'LOCAL'
    return isLocal ? localAuthMiddleware(tracingHandler) : tracingHandler
}

const handlerPromise = initializeGQLHandler()

const gqlHandler: Handler = async (event, context, completion) => {
    // Once initialized, future awaits will return immediately
    const initializedHandler = await handlerPromise

    return await initializedHandler(event, context, completion)
}

exports.graphqlHandler = gqlHandler
