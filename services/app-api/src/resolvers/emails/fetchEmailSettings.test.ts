import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import FETCH_EMAIL_SETTINGS from '../../../../app-graphql/src/queries/fetchEmailSettings.graphql'
import { UserType } from '../../domain-models'

describe('fetchEmailSettings', () => {
    const testUserCMS = {
        id: 'f7571910-ef02-427d-bae3-3e945e20e59d',
        role: 'CMS_USER',
        email: 'zuko@example.com',
        familyName: 'Zuko',
        givenName: 'Prince',
        stateAssignments: [],
    }

    const testUserState: UserType = {
        id: '5ac0fe75-f932-4d76-984e-e99ffb31138d',
        stateCode: 'FL',
        role: 'STATE_USER',
        email: 'aang@mn.gov',
        familyName: 'Aang',
        givenName: 'Aang',
    }

    const testUserAdmin: UserType = {
        id: '5ac0fe75-f932-4d76-984e-e99ffb31144d',
        role: 'ADMIN_USER',
        email: 'iroh@admin.gov',
        familyName: 'Iroh',
        givenName: 'Uncle',
    }

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

    it('returns  error for cms user', async () => {
        const server = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
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

        // confirm that we get what we got
        expect(res.errors).toBeDefined()

        expect(res.data?.fetchEmailSettings.config).toBeDefined()
    })
})
