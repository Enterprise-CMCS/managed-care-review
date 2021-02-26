// apollo_gql.js
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
        currentUser: User
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
        currentUser: async (_parent, _args, context) => {
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
        return {
            headers: event.headers,
            functionName: context.functionName,
            event,
            context,
        }
    },
})

exports.graphqlHandler = server.createHandler({
    cors: {
        origin: true,
        credentials: true,
    },
})
