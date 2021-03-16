import { createTestClient } from 'apollo-server-testing'
import { Config } from 'apollo-server-lambda'

import { constructTestServer } from '../utils/jestUtils'
import GET_CURRENT_USER from '../../app-graphql/src/queries/currentUserQuery.graphql'

describe('currentUser', () => {
    it('returns the currentUser', async () => {
        const server = constructTestServer()
        const { query } = createTestClient(server)

        // make a mock request
        const res = await query({ query: GET_CURRENT_USER })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data.getCurrentUser.email).toBe('james@example.com')
        expect(res.data.getCurrentUser.state.code).toBe('FL')
        expect(res.data.getCurrentUser.state.programs).toHaveLength(1)
    })

    it('returns a state with no programs if the state is not in valid state list', async () => {
        const context = (context: Config['context']) => {
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
        }
        const server = constructTestServer({ context })
        const { query } = createTestClient(server)

        // make a mock request
        const res = await query({ query: GET_CURRENT_USER })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data.getCurrentUser.email).toBe('james@example.com')
        expect(res.data.getCurrentUser.state.code).toBe('MI')
        expect(res.data.getCurrentUser.state.name).toBe(
            'This state is not part of the pilot'
        )
    })
})
