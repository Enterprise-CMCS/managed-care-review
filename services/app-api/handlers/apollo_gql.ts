// apollo_gql.js
import { APIGatewayProxyHandler } from 'aws-lambda'

import {
    ApolloServer,
    AuthenticationError,
    gql,
    IResolvers,
} from 'apollo-server-lambda'

import {
    userFromAuthProvider,
    userFromCognitoAuthProvider,
    userFromLocalAuthProvider,
} from '../authn'

// Construct a schema, using GraphQL schema language
// TODO: add StateCode and Role
const typeDefs = gql`
    type Query {
        hello: User
    }
    type User {
        role: String
        email: String
        state: String
        name: String
    }
`

// Provide resolver functions for your schema fields
const resolvers: IResolvers = {
    Query: {
        hello: async (_parent, _args, context) => {
            let userFetcher: userFromAuthProvider

            if (process.env.REACT_APP_LOCAL_LOGIN) {
                userFetcher = userFromLocalAuthProvider
            } else {
                userFetcher = userFromCognitoAuthProvider
            }

            const authProvider =
                context.event.requestContext.identity
                    .cognitoAuthenticationProvider
            if (authProvider == undefined) {
                throw new AuthenticationError(
                    'This should only be possible in DEV, AWS should always populate cogito values'
                )
            }

            try {
                const userResult = await userFetcher(authProvider)

                if (userResult.isErr()) {
                    throw new AuthenticationError(userResult.error.message)
                }

                return userResult.value
            } catch {
                console.log('PROBLEM YO')
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
        console.log('CALLED ME', event, context)

        return {
            headers: event.headers,
            functionName: context.functionName,
            event,
            context,
        }
    },
})

function bodyMiddleware(
    wrapped: APIGatewayProxyHandler
): APIGatewayProxyHandler {
    return function (event, context, completion) {
        // For reasons I don't understand
        // when graphql requests are sent by the amplify library to AWS
        // they are arriving with some escaping that is breaking apollo server.
        // This transformation attempts and fails to make things work again.

        // this is actually what's being sent in the body. It's a string. Shouldn't it be not a string?
        // AWS: "{\"operationName\":\"hello\",\"variables\":{},\"query\":\"query hello {\\n  hello\\n}\\n\"}"
        // LOC: {"operationName":"hello","variables":{},"query":"query hello {\n  hello\n}\n"}

        console.log('BODY MIDDLEWARE BYTES', event.body)
        if (event.body !== null) {
            console.log('BODY FIRST', event.body[0])

            var myBuffer = []
            var str: string = event.body
            var buffer = new Buffer(str, 'utf16le')
            for (var i = 0; i < buffer.length; i++) {
                myBuffer.push(buffer[i])
            }

            console.log('MIDDLE BYTES', myBuffer)

            console.log(
                'MAYBE MIDDLEWARE',
                JSON.stringify(JSON.parse(event.body))
            )
            event.body = JSON.stringify(JSON.parse(event.body))
        }

        // HACK, this string works, but the string we are sent does not.
        event.body =
            '{"operationName":"hello","variables":{},"query":"query hello {\\n  hello { email state role name } \\n}\\n"}'
        console.log('AFTER MIDDLEWARE', event.body)

        return wrapped(event, context, completion)
    }
}

exports.graphqlHandler = bodyMiddleware(
    server.createHandler({
        cors: {
            origin: true,
            credentials: true,
        },
    })
)
