import { ApolloServer } from 'apollo-server-lambda'
import {
    Handler,
    APIGatewayProxyHandler,
    APIGatewayProxyEvent,
} from 'aws-lambda'

import typeDefs from '../../app-graphql/src/schema.graphql'
import {
    assertIsAuthMode,
    CognitoUserType,
} from '../../app-web/src/common-code/domain-models'

import { newDeployedStore, newLocalStore } from '../store'
import { configureResolvers } from '../resolvers'
import {
    userFromLocalAuthProvider,
    userFromCognitoAuthProvider,
    userFromAuthProvider,
} from '../authn'
import { NewPostgresStore, NewPrismaClient } from '../postgres/'
import { FetchSecrets } from '../secrets'

// The Context type passed to all of our GraphQL resolvers
export interface Context {
    user: CognitoUserType
}

// This function pulls auth info out of the cognitoAuthenticationProvider in the lambda event
// and turns that into our GQL resolver context object
function contextForRequestForFetcher(
    userFetcher: userFromAuthProvider
): ({ event }: { event: APIGatewayProxyEvent }) => Promise<Context> {
    return async ({ event }) => {
        const authProvider =
            event.requestContext.identity.cognitoAuthenticationProvider
        if (authProvider) {
            try {
                const userResult = await userFetcher(authProvider)

                if (!userResult.isErr()) {
                    return {
                        user: userResult.value,
                    }
                } else {
                    throw new Error(
                        `Log: failed to fetch user: ${userResult.error}`
                    )
                }
            } catch (err) {
                console.log('Error attempting to fetch user: ', err)
                throw new Error('Log: placing user in gql context failed')
            }
        } else {
            throw new Error('Log: no AuthProvider')
        }
    }
}

// This middleware returns an error if the local request is missing authentication info
function localAuthMiddleware(
    wrapped: APIGatewayProxyHandler
): APIGatewayProxyHandler {
    return function (event, context, completion) {
        const userHeader =
            event.requestContext.identity.cognitoAuthenticationProvider

        if (userHeader === 'NO_USER') {
            console.log('NO_USER info set, returning 403')
            return Promise.resolve({
                statusCode: 403,
                body: '{ "error": "No User Sent in cognitoAuthenticationProvider header"}\n',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            })
        }

        return wrapped(event, context, completion)
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

    const useDynamo = process.env.USE_DYNAMO
    const dynamoConnection = process.env.DYNAMO_CONNECTION
    const defaultRegion = process.env.AWS_DEFAULT_REGION
    const stageName = process.env.stage
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const dbURL = process.env.DATABASE_URL

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }

    const getDynamoStore = () => {
        const dbPrefix = stageName + '-'

        if (dynamoConnection === 'USE_AWS') {
            return newDeployedStore(defaultRegion || 'no region', dbPrefix)
        } else {
            return newLocalStore(dynamoConnection || 'no db url')
        }
    }

    const getPostgresStore = async () => {
        console.log('Getting Postgres Connection')

        let dbConnectionURL = dbURL
        if (dbURL === 'AWS_SM') {
            if (!secretsManagerSecret) {
                console.log(
                    'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
                )
                throw new Error(
                    'Init Error: The env var SECRETS_MANAGER_SECRET must be set if DATABASE_URL=AWS_SM'
                )
            }

            // We need to pull the db url out of AWS Secrets Manager
            // if we put more secrets in here, we'll probably need to instantiate it somewhere else
            const secretsResult = await FetchSecrets(secretsManagerSecret)
            if (secretsResult instanceof Error) {
                console.log(
                    'Init Error: Failed to fetch secrets from Secrets Manager',
                    secretsResult
                )
                throw secretsResult
            }

            dbConnectionURL = secretsResult.pgConnectionURL
        }

        const prismaResult = await NewPrismaClient(dbConnectionURL)

        if (prismaResult instanceof Error) {
            console.log(
                'Error: attempting to create prisma client: ',
                prismaResult
            )
            throw new Error('Failed to create Prisma Client')
        }

        return NewPostgresStore(prismaResult)
    }

    const store =
        useDynamo === 'YES' ? getDynamoStore() : await getPostgresStore()

    // Resolvers are defined and tested in the resolvers package
    const resolvers = configureResolvers(store)

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

    // Locally, we wrap our handler in a middleware that returns 403 for unauthenticated requests
    const isLocal = authMode === 'LOCAL'
    return isLocal ? localAuthMiddleware(handler) : handler
}

const handlerPromise = initializeGQLHandler()

const gqlHandler: Handler = async (event, context, completion) => {
    // Once initialized, future awaits will return immediately
    const initializedHandler = await handlerPromise
    console.log('initalizedHandler has awaited')

    return await initializedHandler(event, context, completion)
}

exports.graphqlHandler = gqlHandler
