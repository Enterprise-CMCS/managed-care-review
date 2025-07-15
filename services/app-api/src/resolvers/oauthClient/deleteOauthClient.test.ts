import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import {
    testAdminUser,
    testStateUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    DeleteOauthClientDocument,
} from '../../gen/gqlClient'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('deleteOauthClient', () => {
    it('deletes an OAuth client as ADMIN', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        // Create CMS user in database
        const client = await sharedTestPrismaClient()
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create a client first
        const createRes = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'To delete',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
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
        expect(deleteRes.data?.deleteOauthClient.oauthClient.user).toBeDefined()
        expect(deleteRes.data?.deleteOauthClient.oauthClient.user.id).toBe(
            cmsUser.id
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
