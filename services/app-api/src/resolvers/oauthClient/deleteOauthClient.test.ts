import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    DeleteOauthClientDocument,
} from '../../gen/gqlClient'

describe('deleteOauthClient', () => {
    it('deletes an OAuth client as ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        // Create a client first
        const createRes = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'To delete',
                    grants: ['client_credentials'],
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId
        // Delete it
        const deleteRes = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId } },
        })
        expect(deleteRes.errors).toBeUndefined()
        expect(deleteRes.data?.deleteOauthClient.oauthClient.clientId).toBe(
            clientId
        )
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const res = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'fake' } },
        })
        expect(res.errors?.[0].message).toMatch(/forbidden/i)
    })

    it('errors if client not found', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const res = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'nonexistent' } },
        })
        expect(res.errors?.[0].message).toMatch(/not found/i)
    })

    it('errors on DB failure', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
            store: {
                ...{},
                getOAuthClientByClientId: async () => ({
                    id: '1',
                    clientId: 'fail',
                    clientSecret: '',
                    grants: [] as string[],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastUsedAt: null,
                    description: null,
                    contactEmail: null,
                }),
                deleteOAuthClient: async () => new Error('DB fail'),
            },
        })
        const res = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'fail' } },
        })
        expect(res.errors?.[0].message).toMatch(/fail/i)
    })
})
