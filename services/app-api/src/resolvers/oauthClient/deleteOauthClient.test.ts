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
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'

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
        const createResponse = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'To delete',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        }, {
            contextValue: { user: adminUser },
        })
        const createRes = extractGraphQLResponse(createResponse)
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId
        // Delete it
        const deleteResponse = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId } },
        }, {
            contextValue: { user: adminUser },
        })
        const deleteRes = extractGraphQLResponse(deleteResponse)
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
        const stateUser = testStateUser()
        const server = await constructTestPostgresServer({
            context: { user: stateUser },
        })
        const response = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'fake' } },
        }, {
            contextValue: { user: stateUser },
        })
        const res = extractGraphQLResponse(response)
        expect(res.errors?.[0].message).toBe(
            'user not authorized to delete OAuth clients'
        )
    })

    it('errors if client not found', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        const response = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'nonexistent' } },
        }, {
            contextValue: { user: adminUser },
        })
        const res = extractGraphQLResponse(response)
        expect(res.errors?.[0].message).toBe('Failed to delete OAuth client')
        expect(res.errors?.[0].extensions?.code).toBe('INTERNAL_SERVER_ERROR')
        expect(res.errors?.[0].extensions?.cause).toBe('DB_ERROR')
    })

    it('errors on DB failure', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
            store: {
                ...{},
                deleteOAuthClient: async () => new Error('DB fail'),
            },
        })
        const response = await server.executeOperation({
            query: DeleteOauthClientDocument,
            variables: { input: { clientId: 'fail' } },
        }, {
            contextValue: { user: adminUser },
        })
        const res = extractGraphQLResponse(response)
        expect(res.errors?.[0].message).toMatch(/fail/i)
    })
})
