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
                    contactEmail: 'test@example.com',
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
        expect(res.errors?.[0].message).toBe(
            'user not authorized to delete OAuth clients'
        )
    })

    it('errors if client not found', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const res = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'nonexistent' } },
        })
        expect(res.errors?.[0].message).toBe('Failed to delete OAuth client')
        expect(res.errors?.[0].extensions?.code).toBe('INTERNAL_SERVER_ERROR')
        expect(res.errors?.[0].extensions?.cause).toBe('DB_ERROR')
    })

    it('errors on DB failure', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
            store: {
                ...{},
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
