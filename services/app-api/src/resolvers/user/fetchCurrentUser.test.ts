import type { Context } from '../../handlers/apollo_gql'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { FetchCurrentUserDocument } from '../../gen/gqlClient'
import { typedStatePrograms } from '@mc-review/submissions'
import { testStateUser } from '../../testHelpers/userHelpers'

describe('currentUser', () => {
    it('returns the currentUser', async () => {
        const server = await constructTestPostgresServer()

        // make a mock request
        const res = await executeGraphQLOperation(server, {
            query: FetchCurrentUserDocument,
        })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data?.fetchCurrentUser.email).toBe('james@example.com')
        expect(res.data?.fetchCurrentUser.state.code).toBe('FL')
        const FLPrograms =
            typedStatePrograms.states.find((st) => st.code === 'FL')
                ?.programs ?? []
        expect(res.data?.fetchCurrentUser.state.programs).toHaveLength(
            FLPrograms.length
        )
    })

    it('returns programs for MI', async () => {
        const customContext: Context = {
            user: testStateUser({
                stateCode: 'MI',
                email: 'james@example.com',
                familyName: 'Brown',
                givenName: 'James',
            }),
        }

        const server = await constructTestPostgresServer({
            context: customContext,
        })

        // make a mock request
        const res = await executeGraphQLOperation(server, {
            query: FetchCurrentUserDocument,
        })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data?.fetchCurrentUser.email).toBe('james@example.com')
        expect(res.data?.fetchCurrentUser.state.code).toBe('MI')
        expect(res.data?.fetchCurrentUser.state.name).toBe('Michigan')
        expect(res.data?.fetchCurrentUser.state.programs).toHaveLength(7)
    })

    it('updates DB when user info changes', async () => {
        // Use a fixed ID so both servers reference the same DB user
        const userId = 'test-sync-user-id'

        const originalUser = testStateUser({
            id: userId,
            email: 'original@example.com',
            givenName: 'Original',
            familyName: 'Name',
            stateCode: 'FL',
        })

        // First server call inserts the user into the DB
        const originalContext: Context = { user: originalUser }
        const server1 = await constructTestPostgresServer({
            context: originalContext,
        })

        const res1 = await executeGraphQLOperation(server1, {
            query: FetchCurrentUserDocument,
        })
        expect(res1.errors).toBeUndefined()
        expect(res1.data?.fetchCurrentUser.email).toBe('original@example.com')
        expect(res1.data?.fetchCurrentUser.givenName).toBe('Original')
        expect(res1.data?.fetchCurrentUser.familyName).toBe('Name')

        // Second server call uses the same user ID but with updated info.
        // syncUserWithAurora should detect the mismatch and update the DB.
        const updatedUser = testStateUser({
            id: userId,
            email: 'updated@example.com',
            givenName: 'Updated',
            familyName: 'Person',
            stateCode: 'FL',
        })

        const updatedContext: Context = { user: updatedUser }
        const server2 = await constructTestPostgresServer({
            context: updatedContext,
        })

        const res2 = await executeGraphQLOperation(server2, {
            query: FetchCurrentUserDocument,
        })
        expect(res2.errors).toBeUndefined()
        expect(res2.data?.fetchCurrentUser.email).toBe('updated@example.com')
        expect(res2.data?.fetchCurrentUser.givenName).toBe('Updated')
        expect(res2.data?.fetchCurrentUser.familyName).toBe('Person')
    })
})
