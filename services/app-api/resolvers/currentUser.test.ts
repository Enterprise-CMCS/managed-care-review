import { ApolloServer } from 'apollo-server-lambda'
import { createTestClient } from 'apollo-server-testing'

import { Resolvers } from '../gen/gqlServer'
import typeDefs from '../../app-graphql/src/schema.graphql'
import GET_CURRENT_USER from '../../app-graphql/src/queries/currentUserQuery.graphql'
import { userFromLocalAuthProvider } from '../authn'

import { getCurrentUserResolver } from './currentUser'
import { userResolver } from './userResolver'

describe('currentUser', () => {
    it('returns the currentUser', async () => {
        const resolvers: Resolvers = {
            Query: {
                getCurrentUser: getCurrentUserResolver(
                    userFromLocalAuthProvider
                ),
            },
            User: userResolver,
        }

        // create an apollo server
        const server = new ApolloServer({
            typeDefs,
            resolvers,
            playground: {
                endpoint: '/local/graphql',
            },
            context: ({ context }) => {
                const event = {
                    requestContext: {
                        identity: {
                            cognitoAuthenticationProvider:
                                '{ "name": "james brown", "state_code": "FL", "role": "STATE_USER", "email": "james@example.com" }',
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
        expect(res.data.getCurrentUser.state.code).toBe('FL')
    })

    it('returns an error if the state is not in valid state list', async () => {
        const resolvers: Resolvers = {
            Query: {
                getCurrentUser: getCurrentUserResolver(
                    userFromLocalAuthProvider
                ),
            },
            User: userResolver,
        }

        // create an apollo server
        const server = new ApolloServer({
            typeDefs,
            resolvers,
            playground: {
                endpoint: '/local/graphql',
            },
            context: ({ context }) => {
                const event = {
                    requestContext: {
                        identity: {
                            cognitoAuthenticationProvider:
                                '{ "name": "james brown", "state_code": "MI", "role": "STATE_USER", "email": "james@example.com" }',
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
        expect(res.errors).toBeDefined()
        expect(res.errors && res.errors[0].message).toBe(
            'No state data for users state: MI'
        )
    })
})
