import { ApolloServer} from 'apollo-server-lambda'
import { APIGatewayProxyHandler, APIGatewayProxyEvent, Context as LambdaContext} from 'aws-lambda'
import { newDeployedStore, newLocalStore} from '../store/index'
import { GraphQLDate } from 'graphql-scalars';

import {
    createDraftSubmissionResolver,
    getCurrentUserResolver,
    userResolver,
} from '../resolvers'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models'
import { Resolvers } from '../gen/gqlServer'
import typeDefs from '../../app-graphql/src/schema.graphql'
import {
    userFromLocalAuthProvider,
    userFromCognitoAuthProvider,
} from '../authn'

import { assertIsAuthMode } from '../../app-web/src/common-code/domain-models'

// Configuration:
const authMode = process.env.REACT_APP_AUTH_MODE
assertIsAuthMode(authMode)

const getDynamoStore = () => {
    const dynamoConnection = process.env.DYNAMO_CONNECTION
if (dynamoConnection === 'USE_AWS') {
    return newDeployedStore(process.env.AWS_DEFAULT_REGION || 'no region')
} else {
    return newLocalStore(process.env.DYNAMO_CONNECTION || 'no db url')
}
}
const store = getDynamoStore()

const userFetcher =
    authMode === 'LOCAL'
        ? userFromLocalAuthProvider
        : userFromCognitoAuthProvider
// End Configuration

// Resolvers are defined and tested in the resolvers package
const resolvers: Resolvers = {
    Date: GraphQLDate,
    Query: {
        getCurrentUser: getCurrentUserResolver(),
    },
    Mutation: {
        createDraftSubmission: createDraftSubmissionResolver(store),
    },
    User: userResolver,
}

export interface Context {
    user: CognitoUserType
}
const context = async ({event}: { event: APIGatewayProxyEvent, context: LambdaContext }): Promise<Context | undefined>  => {
    const authProvider = event.requestContext.identity.cognitoAuthenticationProvider
    if (authProvider) {
        try {
            const userResult = await userFetcher(authProvider)

        if (!userResult.isErr()) {
            return {
                user: userResult.value
            }
        }
        } catch (err) {
            throw new Error('Log: placing user in gql context failed')
        }
    } else {
        throw new Error('Log: no AuthProvider')
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: {
        endpoint: '/local/graphql',
    },
    context
})

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
                body:
                    '{ "error": "No User Sent in cognitoAuthenticationProvider header"}\n',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            })
        }

        return wrapped(event, context, completion)
    }
}

const gqlHandler = server.createHandler({
    cors: {
        origin: true,
        credentials: true,
    },
})

const isLocal = authMode === 'LOCAL'

exports.graphqlHandler = isLocal ? localAuthMiddleware(gqlHandler) : gqlHandler
