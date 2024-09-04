import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import FETCH_EMAIL_SETTINGS from '../../../../app-graphql/src/queries/fetchEmailSettings.graphql'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'

describe('fetchEmailSettings', () => {
    const testUserState = testStateUser()
    const testUserAdmin = testAdminUser()

    it('returns email configuration', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testUserAdmin,
            },
        })

        // make a mock request
        const res = await server.executeOperation({
            query: FETCH_EMAIL_SETTINGS,
        })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data?.fetchEmailSettings.config).toBeDefined()
    })
    it('returns state analysts', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testUserAdmin,
            },
        })

        // make a mock request
        const res = await server.executeOperation({
            query: FETCH_EMAIL_SETTINGS,
        })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data?.fetchEmailSettings.stateAnalysts).toBeDefined()
    })

    it('returns  error for state user', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testUserState,
            },
        })

        // make a mock request
        const res = await server.executeOperation({
            query: FETCH_EMAIL_SETTINGS,
        })

        if (res.errors === undefined) {
            throw new Error('Expected errors to be defined')
        }
        expect(res.errors).toHaveLength(1)
        const resultErr = res.errors[0]

        expect(resultErr?.message).toBe('user not authorized to fetch settings')
        expect(resultErr?.extensions?.code).toBe('FORBIDDEN')
    })
})
