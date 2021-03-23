// apollo_gql.js
import { ApolloServer } from 'apollo-server-lambda'
import { APIGatewayProxyHandler } from 'aws-lambda'
import {
    newLocalStore
} from '../store/index'

import {
    createDraftSubmissionResolver,
    getCurrentUserResolver,
    userResolver,
} from '../resolvers'

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

// TODO: config based on environment
const store = newLocalStore(process.env.LOCAL_DYNAMO_URL || 'no db url')

const userFetcher =
    authMode === 'LOCAL'
        ? userFromLocalAuthProvider
        : userFromCognitoAuthProvider

// End Configuration

// Our resolvers are defined and tested in the resolvers package
const resolvers: Resolvers = {
    Query: {
        getCurrentUser: getCurrentUserResolver(userFetcher),
    },
    Mutation: {
        createDraftSubmission: createDraftSubmissionResolver(store),
    },
    User: userResolver,
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: {
        endpoint: '/local/graphql',
    },
    context: ({ event, context }) => {
        return {
            headers: event.headers,
            functionName: context.functionName,
            event,
            context,
        }
    },
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
