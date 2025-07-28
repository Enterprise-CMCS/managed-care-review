import type { Context } from '../../handlers/apollo_gql'
import { constructTestPostgresServer, extractGraphQLResponse } from '../../testHelpers/gqlHelpers'
import { FetchCurrentUserDocument } from '../../gen/gqlClient'
import { typedStatePrograms } from '@mc-review/hpp'
import { testStateUser } from '../../testHelpers/userHelpers'

describe('currentUser', () => {
    it('returns the currentUser', async () => {
        const server = await constructTestPostgresServer()

        // make a mock request
        const res = await server.executeOperation({
            query: FetchCurrentUserDocument,
        }, {
            contextValue: {
                user: testStateUser(),
            },
        })

        // confirm that we get what we got
        const result = extractGraphQLResponse(res)
        expect(result.errors).toBeUndefined()

        expect(result.data?.fetchCurrentUser.email).toBe('james@example.com')
        expect(result.data?.fetchCurrentUser.state.code).toBe('FL')
        const FLPrograms =
            typedStatePrograms.states.find((st) => st.code === 'FL')
                ?.programs ?? []
        expect(result.data?.fetchCurrentUser.state.programs).toHaveLength(
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
        const res = await server.executeOperation({
            query: FetchCurrentUserDocument,
        }, {
            contextValue: customContext,
        })

        // confirm that we get what we got
        const result = extractGraphQLResponse(res)
        expect(result.errors).toBeUndefined()

        expect(result.data?.fetchCurrentUser.email).toBe('james@example.com')
        expect(result.data?.fetchCurrentUser.state.code).toBe('MI')
        expect(result.data?.fetchCurrentUser.state.name).toBe('Michigan')
        expect(result.data?.fetchCurrentUser.state.programs).toHaveLength(6)
    })
})
