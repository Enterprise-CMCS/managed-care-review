import { ApolloServer } from 'apollo-server-lambda'
import { createTestClient } from 'apollo-server-testing'

import { Resolvers } from '../gen/gqlServer'
import typeDefs from '../../app-graphql/src/schema.graphql'
import GET_CURRENT_USER from '../../app-graphql/src/queries/currentUserQuery.graphql'

import { CognitoUserType } from '../../app-web/src/common-code/domain-models'
import { getCurrentUserResolver } from './currentUser'
import statePrograms from '../data/statePrograms.json'

const isCognitoUser = (maybeUser: unknown): maybeUser is CognitoUserType => {
    if (maybeUser && typeof maybeUser === 'object'){
        if ("state_code" in maybeUser){
            return true
        }
    }
    return false
}

describe('currentUser', () => {
    it('returns the currentUser', async () => {
        const resolvers: Resolvers = {
            Query: {
                getCurrentUser: getCurrentUserResolver
                // getState: getStateResolver,
            },
            User: {
                state(parent) {
                 
                  if (isCognitoUser(parent)) {
                    const userState = parent.state_code
                    const state = statePrograms.states.find((st) => st.code === userState)

                    if (state === undefined) {
                        throw new Error('No state data for users state: ' + userState)
                    }
                    return state
                  }
                  throw new Error('help')
                },
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
})
