import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    testAdminUser,
    testStateUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { CreateOauthClientDocument } from '../../gen/gqlClient'
import { OAuthScope } from '../../generated/enums'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('createOauthClient', () => {
    it('creates a new OAuth client as ADMIN', async () => {
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
        const input = {
            grants: ['client_credentials', 'refresh_token'],
            scopes: [OAuthScope.CMS_SUBMISSION_ACTIONS],
            description: 'Test client',
            userID: cmsUser.id,
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.createOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient.clientId).toMatch(/^oauth-client-/)
        expect(oauthClient.clientSecret).toHaveLength(86) // 64 bytes base64url
        expect(oauthClient.grants).toEqual(expect.arrayContaining(input.grants))
        expect(oauthClient.scopes).toEqual(input.scopes)
        expect(oauthClient.description).toBe(input.description)
        expect(oauthClient.user).toBeDefined()
        expect(oauthClient.user.id).toBe(cmsUser.id)
    })

    it('creates a new OAuth client associated with an ADMIN user', async () => {
        const adminUser = testAdminUser()
        const oauthAdminUser = testAdminUser({
            email: 'oauth-admin@example.com',
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
        const input = {
            grants: ['client_credentials'],
            scopes: [OAuthScope.ADMIN_SUBMISSION_ACTIONS],
            description: 'Admin OAuth client',
            userID: oauthAdminUser.id,
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })

        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.createOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient?.scopes).toEqual([
            OAuthScope.ADMIN_SUBMISSION_ACTIONS,
        ])
        expect(oauthClient?.user).toBeDefined()
        expect(oauthClient?.user.id).toBe(oauthAdminUser.id)
        expect(oauthClient?.user.role).toBe('ADMIN_USER')
    })

    it('errors when assigning CMS_SUBMISSION_ACTIONS scope to an ADMIN user client', async () => {
        const adminUser = testAdminUser()
        const oauthAdminUser = testAdminUser({
            email: 'oauth-admin-cms-scope@example.com',
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
        const input = {
            grants: ['client_credentials'],
            scopes: [OAuthScope.CMS_SUBMISSION_ACTIONS],
            description: 'Admin OAuth client with CMS scope',
            userID: oauthAdminUser.id,
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
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
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    grants: ['client_credentials'],
                    scopes: [OAuthScope.ADMIN_SUBMISSION_ACTIONS],
                    description: 'Invalid admin scope client',
                    userID: cmsUser.id,
                },
            },
        })

        expect(res.errors?.[0].message).toMatch(
            /OAuth scopes are not valid for the selected user role/
        )
        expect(res.errors?.[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(res.errors?.[0].extensions?.argumentName).toBe('scopes')
    })

    it('defaults to ["client_credentials"] if no grants provided', async () => {
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
        const input = {
            description: 'No grants',
            userID: cmsUser.id,
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.createOauthClient.oauthClient
        expect(oauthClient.grants).toEqual(['client_credentials'])
    })

    it('errors if not ADMIN', async () => {
        const stateUser = testStateUser()
        const server = await constructTestPostgresServer({
            context: { user: stateUser },
        })
        const input = {
            grants: ['client_credentials'],
            userID: stateUser.id,
            description: 'Should fail',
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/only admin users/i)
    })

    it('errors on DB failure', async () => {
        const adminUser = testAdminUser()
        // Use a mock store that throws
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
            store: {
                ...{},
                findUser: async () => cmsUser,
                createOAuthClient: async () => new Error('DB fail'),
            },
        })
        const input = {
            grants: ['client_credentials'],
            userID: cmsUser.id,
            description: 'DB fail',
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/db fail/i)
    })

    it('errors with invalid userID', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
            store: {
                ...{},
            },
        })
        const input = {
            grants: ['client_credentials'],
            userID: 'invalid-user-id',
            description: 'Should fail',
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(
            /User with ID invalid-user-id does not exist/
        )
    })

    it('returns errors when postgres fails', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
            store: {
                ...{},
                findUser: async () => new Error('Generic postgres error'),
            },
        })
        const input = {
            grants: ['client_credentials'],
            userID: 'invalid-user-id',
            description: 'Should fail',
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/Generic postgres error/)
    })

    it('creates an oauth client with required fields', async () => {
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
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Test client',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        })
        expect(res.errors).toBeUndefined()
        expect(res.data?.createOauthClient.oauthClient).toBeDefined()
    })

    it('errors when trying to associate OAuth client with an ineligible user', async () => {
        const adminUser = testAdminUser()
        const stateUser = testStateUser()

        // Create state user in database
        const client = await sharedTestPrismaClient()
        await client.user.create({
            data: {
                id: stateUser.id,
                givenName: stateUser.givenName,
                familyName: stateUser.familyName,
                email: stateUser.email,
                role: stateUser.role,
                stateCode: stateUser.stateCode,
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        const input = {
            description: 'Should fail with state user',
            grants: ['client_credentials'],
            userID: stateUser.id,
        }
        const res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(
            /OAuth clients can only be associated with CMS or admin users/
        )
    })
})
