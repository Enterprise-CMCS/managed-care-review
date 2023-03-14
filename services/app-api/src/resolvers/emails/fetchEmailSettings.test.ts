import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import FETCH_EMAIL_SETTINGS from '../../../../app-graphql/src/queries/fetchEmailSettings.graphql'
import { UserType } from '../../domain-models'

describe('fetchEmailSettings', () => {
    it('returns email configuration', async () => {
        const testAdminUser: UserType = {
            id: '5ac0fe75-f932-4d76-984e-e99ffb31144d',
            role: 'ADMIN_USER',
            email: 'iroh@admin.gov',
            familyName: 'Iroh',
            givenName: 'Uncle',
        }

        const server = await constructTestPostgresServer({
            context: {
                user: testAdminUser,
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
})
