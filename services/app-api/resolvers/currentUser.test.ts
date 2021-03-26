import { createTestClient } from 'apollo-server-testing'
import {Context} from '../handlers/apollo_gql'

import { constructTestServer } from '../testHelpers/gqlHelpers'
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
        expect(res.data.getCurrentUser.state.programs).toHaveLength(4)
    })

    it('returns a state with no programs if the state is not in valid state list', async () => {
        const customContext: Context = {
             user: { name: "james brown", state_code: "MI", role: "STATE_USER", email: "james@example.com" }
         }
        
        const server = constructTestServer({ context: customContext})
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
