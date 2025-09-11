import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    testAdminUser,
    testStateUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    UpdateOauthClientDocument,
} from '../../gen/gqlClient'

describe('updateOauthClient', () => {
    it('updates an OAuth client as ADMIN', async () => {
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

        const createRes = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Initial description',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId

        // Update the client
        const updateInput = {
            clientId,
            description: 'Updated description',
            grants: ['client_credentials', 'refresh_token'],
        }

        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: { input: updateInput },
        })

        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.updateOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient.description).toBe(updateInput.description)
        expect(oauthClient.user).toBeDefined()
        expect(oauthClient.user.id).toBe(cmsUser.id)
        expect(oauthClient.grants).toEqual(
            expect.arrayContaining(updateInput.grants)
        )
    })

    it('ignores empty string values', async () => {
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

        const createRes = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Initial description',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId

        // Update with empty strings
        const updateInput = {
            clientId,
            description: '',
            grants: [],
        }

        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: { input: updateInput },
        })

        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.updateOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient.description).toBe('Initial description')
        expect(oauthClient.user.email).toContain('@example.com')
        expect(oauthClient.grants).toEqual(['client_credentials'])
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const input = {
            clientId: 'test-client-id',
            description: 'Should fail',
        }
        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/not authorized/i)
        expect(res.errors?.[0].extensions?.code).toBe('FORBIDDEN')
    })

    it('errors if client not found', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const input = {
            clientId: 'non-existent-client-id',
            description: 'Should fail',
        }
        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/not found/i)
        expect(res.errors?.[0].extensions?.code).toBe('NOT_FOUND')
        expect(res.errors?.[0].extensions?.cause).toBe('CLIENT_NOT_FOUND')
    })

    it('errors on DB failure', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
            store: {
                ...{},
                updateOAuthClient: async () => new Error('DB fail'),
            },
        })
        const input = {
            clientId: 'fail',
            description: 'DB fail',
        }
        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/fail/i)
        expect(res.errors?.[0].extensions?.code).toBe('INTERNAL_SERVER_ERROR')
        expect(res.errors?.[0].extensions?.cause).toBe('DB_ERROR')
    })
})
