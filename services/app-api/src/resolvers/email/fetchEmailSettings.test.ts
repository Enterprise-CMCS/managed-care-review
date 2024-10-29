import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { FetchEmailSettingsDocument } from '../../gen/gqlClient'
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
            query: FetchEmailSettingsDocument,
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
            query: FetchEmailSettingsDocument,
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
            query: FetchEmailSettingsDocument,
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
