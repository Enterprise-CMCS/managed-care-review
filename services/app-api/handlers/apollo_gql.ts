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
const typeDefs = gql`
	type Query {
		hello: String
	}
`

// Provide resolver functions for your schema fields
const resolvers: IResolvers = {
	Query: {
		hello: async (parent, args, context, info) => {
			console.log('WOAH', context, info)

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

			const userResult = await userFetcher(authProvider)
			if (userResult.isErr()) {
				throw new AuthenticationError(userResult.error.message)
			}

			const user = userResult.value

			return `Hello ${user.email}!`
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

exports.graphqlHandler = server.createHandler({
	cors: {
		origin: true,
		credentials: true,
	},
})
