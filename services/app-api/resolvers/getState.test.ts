import { ApolloServer } from 'apollo-server-lambda'
import { createTestClient } from 'apollo-server-testing'

import { Resolvers } from '../gen/gqlServer'
import typeDefs from '../../app-graphql/src/schema.graphql'
import GET_STATE from '../../app-graphql/src/queries/getStateQuery.graphql'

import { getStateResolver } from './getState'

describe('getState', () => {
    it('returns the frozen data', async () => {
        const resolvers: Resolvers = {
            Query: {
                getState: getStateResolver,
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
                                '{ "name": "mr. minnesota", "state": "MN", "role": "STATE_USER", "email": "mm@example.com" }',
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
        const res = await query({ query: GET_STATE })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        const state = res.data.getState

        expect(state.name).toBe('Minnesota')
        expect(state.programs[0].name).toBe('MSHO')
    })

    it('returns an error if the state is unknown', async () => {
        const resolvers: Resolvers = {
            Query: {
                getState: getStateResolver,
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
        const res = await query({ query: GET_STATE })

        // confirm that we got an error
        expect(res.errors).toBeDefined()

        if (res.errors) {
            expect(res.errors[0].message).toBe(
                'No state data for users state: GA'
            )
        }
    })
})
