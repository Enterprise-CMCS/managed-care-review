import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import {
    testAdminUser,
    testStateUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { DeleteOauthClientDocument } from '../../gen/gqlClient'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('deleteOauthClient', () => {
    it('deletes an OAuth client as ADMIN', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        // Setup: Create a user and OAuth client to delete
        const prismaClient = await sharedTestPrismaClient()
        await prismaClient.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
            },
        })

        const createdClient = await prismaClient.oAuthClient.create({
            data: {
                clientId: `oauth-client-${Date.now()}`,
                clientSecret: 'test-secret',
                grants: ['client_credentials'],
                description: 'Test client to delete',
                userID: cmsUser.id,
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        // Delete the client
        const res = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: createdClient.clientId } },
        })

        expect(res.errors).toBeUndefined()
        const deletedClient = res.data?.deleteOauthClient.oauthClient
        expect(deletedClient).toBeDefined()
        expect(deletedClient.clientId).toBe(createdClient.clientId)

        // Verify it's deleted
        const found = await prismaClient.oAuthClient.findUnique({
            where: { clientId: createdClient.clientId },
        })
        expect(found).toBeNull()
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const res = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'any-client' } },
        })
        expect(res.errors?.[0].message).toMatch(/not authorized/i)
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
            variables: { input: { clientId: 'client-1' } },
        })
        expect(res.errors?.[0].message).toMatch(/failed to delete/i)
    })
})