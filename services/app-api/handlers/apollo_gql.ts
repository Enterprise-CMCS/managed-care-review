// apollo_gql.js

import { ApolloServer, gql } from 'apollo-server-lambda'

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
	type Query {
		hello: String
	}
`

// Provide resolver functions for your schema fields
const resolvers = {
	Query: {
		hello: () => 'Hello world!',
	},
}

const server = new ApolloServer({
	typeDefs,
	resolvers,
	playground: {
		endpoint: '/local/graphql',
	},
	context: ({ event, context }) => ({
		headers: event.headers,
		functionName: context.functionName,
		event,
		context,
	}),
})

exports.graphqlHandler = server.createHandler({
	cors: {
		origin: true,
		credentials: true,
	},
})
