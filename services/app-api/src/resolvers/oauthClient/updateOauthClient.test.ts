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
import { NewPostgresStore } from '../../postgres'
import {
    CreateOauthClientDocument,
    UpdateOauthClientDocument,
} from '../../gen/gqlClient'
import { OAuthScope } from '../../generated/client'

describe('updateOauthClient', () => {
    it('updates an OAuth client as ADMIN', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        const client = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(client)
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
            },
        })

        const createdClient = await postgresStore.createOAuthClient({
            description: 'Initial description',
            grants: ['client_credentials'],
            userID: cmsUser.id,
        })

        if (createdClient instanceof Error) {
            throw createdClient
        }

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: { user: adminUser },
        })

        // Update the client
        const updateInput = {
            clientId: createdClient.clientId,
            description: 'Updated description',
            grants: ['client_credentials', 'refresh_token'],
            scopes: [OAuthScope.CMS_SUBMISSION_ACTIONS],
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
        expect(oauthClient.scopes).toEqual(updateInput.scopes)
    })

    it('updates an OAuth client associated with an ADMIN user', async () => {
        const adminUser = testAdminUser()
        const oauthAdminUser = testAdminUser({
            email: 'update-oauth-admin@example.com',
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
                    description: 'Initial admin OAuth client',
                    grants: ['client_credentials'],
                    scopes: [OAuthScope.ADMIN_SUBMISSION_ACTIONS],
                    userID: oauthAdminUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId

        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: {
                input: {
                    clientId,
                    description: 'Updated admin OAuth client',
                    scopes: [OAuthScope.ADMIN_SUBMISSION_ACTIONS],
                },
            },
        })

        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.updateOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient.description).toBe('Updated admin OAuth client')
        expect(oauthClient.scopes).toEqual([
            OAuthScope.ADMIN_SUBMISSION_ACTIONS,
        ])
        expect(oauthClient.user.id).toBe(oauthAdminUser.id)
        expect(oauthClient.user.email).toBe(oauthAdminUser.email)
        expect(oauthClient.user.role).toBe('ADMIN_USER')
    })

    it('errors when assigning CMS_SUBMISSION_ACTIONS scope to an ADMIN user client', async () => {
        const adminUser = testAdminUser()
        const oauthAdminUser = testAdminUser({
            email: 'update-oauth-admin-cms-scope@example.com',
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
                    description: 'Initial admin OAuth client',
                    grants: ['client_credentials'],
                    userID: oauthAdminUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId

        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: {
                input: {
                    clientId,
                    scopes: [OAuthScope.CMS_SUBMISSION_ACTIONS],
                },
            },
        })

        expect(res.errors?.[0].message).toMatch(
            /OAuth scopes are not valid for the selected user role/
        )
        expect(res.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(res.errors?.[0].extensions?.argumentName).toBe('scopes')
    })

    it('errors when assigning ADMIN_SUBMISSION_ACTIONS scope to a CMS user client', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

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
                    description: 'Initial CMS OAuth client',
                    grants: ['client_credentials'],
                    scopes: [OAuthScope.CMS_SUBMISSION_ACTIONS],
                    userID: cmsUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId

        const res = await executeGraphQLOperation(server, {
            query: UpdateOauthClientDocument,
            variables: {
                input: {
                    clientId,
                    scopes: [OAuthScope.ADMIN_SUBMISSION_ACTIONS],
                },
            },
        })

        expect(res.errors?.[0].message).toMatch(
            /OAuth scopes are not valid for the selected user role/
        )
        expect(res.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(res.errors?.[0].extensions?.argumentName).toBe('scopes')
    })

    it('ignores empty string values', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        const client = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(client)
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
            },
        })

        const createdClient = await postgresStore.createOAuthClient({
            description: 'Initial description',
            grants: ['client_credentials'],
            scopes: [OAuthScope.CMS_SUBMISSION_ACTIONS],
            userID: cmsUser.id,
        })

        if (createdClient instanceof Error) {
            throw createdClient
        }

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: { user: adminUser },
        })

        // Update with empty strings
        const updateInput = {
            clientId: createdClient.clientId,
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
        expect(oauthClient.scopes).toEqual([OAuthScope.CMS_SUBMISSION_ACTIONS])
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
