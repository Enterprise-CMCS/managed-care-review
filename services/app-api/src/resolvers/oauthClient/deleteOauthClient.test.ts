import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    testAdminUser,
    testStateUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    DeleteOauthClientDocument,
} from '../../gen/gqlClient'
import { OAuthScope } from '../../generated/client'
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
        const createRes = await executeGraphQLOperation(server, {
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
        const deleteRes = await executeGraphQLOperation(server, {
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

    it('deletes an OAuth client associated with an ADMIN user', async () => {
        const adminUser = testAdminUser()
        const oauthAdminUser = testAdminUser({
            email: 'delete-oauth-admin@example.com',
        })

        const client = await sharedTestPrismaClient()
        await client.user.create({
            data: {
                id: oauthAdminUser.id,
                givenName: oauthAdminUser.givenName,
                familyName: oauthAdminUser.familyName,
                email: oauthAdminUser.email,
                role: oauthAdminUser.role,
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const createRes = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Admin client to delete',
                    grants: ['client_credentials'],
                    scopes: [OAuthScope.ADMIN_SUBMISSION_ACTIONS],
                    userID: oauthAdminUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId

        const deleteRes = await executeGraphQLOperation(server, {
            query: DeleteOauthClientDocument,
            variables: { input: { clientId } },
        })

        expect(deleteRes.errors).toBeUndefined()
        const deletedClient = deleteRes.data?.deleteOauthClient.oauthClient
        expect(deletedClient.clientId).toBe(clientId)
        expect(deletedClient.scopes).toEqual([
            OAuthScope.ADMIN_SUBMISSION_ACTIONS,
        ])
        expect(deletedClient.user.id).toBe(oauthAdminUser.id)
        expect(deletedClient.user.email).toBe(oauthAdminUser.email)
        expect(deletedClient.user.role).toBe('ADMIN_USER')
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const res = await executeGraphQLOperation(server, {
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
        const res = await executeGraphQLOperation(server, {
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'nonexistent' } },
        })
        expect(res.errors?.[0].message).toBe(
            'Failed to delete OAuth client. OAuth client not found'
        )
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
        const res = await executeGraphQLOperation(server, {
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'fail' } },
        })
        expect(res.errors?.[0].message).toMatch(/fail/i)
    })
})
