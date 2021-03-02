import { ApolloServer } from 'apollo-server-lambda'
import { createTestClient } from 'apollo-server-testing'

import { Resolvers } from '../../app-web/src/common-code/graphql/generated/gqlServer'
import typeDefs from '../../app-web/src/common-code/graphql/schema.graphql'
import GET_CURRENT_USER from '../../app-web/src/common-code/graphql/queries/currentUserQuery.graphql'

import { getCurrentUserResolver } from './currentUser'

describe('currentUser', () => {
    it('returns the currentUser', async () => {
        const resolvers: Resolvers = {
            Query: {
                getCurrentUser: getCurrentUserResolver,
            },
        }

        // create an apollo server
        const server = new ApolloServer({
            typeDefs,
            resolvers,
            playground: {
                endpoint: '/local/graphql',
            },
            context: ({ _event, context }) => {
                const event = {
                    requestContext: {
                        identity: {
                            cognitoAuthenticationProvider:
                                '{ "name": "james brown", "state": "GA", "role": "STATE_USER", "email": "james@example.com" }',
                        },
                    },
                }

                return {
                    event,
                    context,
                }
            },
        })

        // create a mock client
        const { query } = createTestClient(server)

        // make a mock request
        process.env.REACT_APP_LOCAL_LOGIN = 'true'
        const res = await query({ query: GET_CURRENT_USER })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data.getCurrentUser.email).toBe('james@example.com')
    })
})
