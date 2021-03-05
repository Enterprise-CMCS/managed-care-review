// apollo_gql.js
import { ApolloServer } from 'apollo-server-lambda'
import { APIGatewayProxyHandler } from 'aws-lambda'

import {
    getCurrentUserResolver,
    getStateResolver,
    userResolver,
} from '../resolvers'

import { Resolvers } from '../gen/gqlServer'
import typeDefs from '../../app-graphql/src/schema.graphql'

// Our resolvers are defined and tested in the resolvers package
const resolvers: Resolvers = {
    Query: {
        getCurrentUser() {
            return {
                role: 'a role',
                name: 'a name',
                email: 'an email',
            }
        },
        // getState: getStateResolver,
    },
    User: {
        state() {
            return {
                name: 'Florida',
                code: 'FL',
                programs: [],
            }
        },
    },
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    playground: {
        endpoint: '/local/graphql',
    },
    context: ({ event, context }) => {
        // TODO, let's do the auth logic right here, if we can error.
        // or rather, let's have an auth middleware.
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
        if (process.env.REACT_APP_LOCAL_LOGIN) {
            console.log(
                'foo',
                event.requestContext.identity.cognitoAuthenticationProvider
            )

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
        }

        return wrapped(event, context, completion)
    }
}

exports.graphqlHandler = localAuthMiddleware(
    server.createHandler({
        cors: {
            origin: true,
            credentials: true,
        },
    })
)
