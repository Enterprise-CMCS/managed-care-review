import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import { CreateOauthClientDocument } from '../../gen/gqlClient'

describe('createOauthClient', () => {
    it('creates a new OAuth client as ADMIN', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        const input = {
            grants: ['client_credentials', 'refresh_token'],
            description: 'Test client',
            userID: adminUser.id,
        }
        const res = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.createOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient.clientId).toMatch(/^oauth-client-/)
        expect(oauthClient.clientSecret).toHaveLength(86) // 64 bytes base64url
        expect(oauthClient.grants).toEqual(expect.arrayContaining(input.grants))
        expect(oauthClient.description).toBe(input.description)
        expect(oauthClient.user).toBeDefined()
        expect(oauthClient.user.id).toBe(adminUser.id)
    })

    it('defaults to ["client_credentials"] if no grants provided', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        const input = {
            description: 'No grants',
            userID: adminUser.id,
        }
        const res = await server.executeOperation({
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
        const res = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/only admin users/i)
    })

    it('errors on DB failure', async () => {
        const adminUser = testAdminUser()
        // Use a mock store that throws
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
            store: {
                ...{},
                findUser: async () => adminUser,
                createOAuthClient: async () => new Error('DB fail'),
            },
        })
        const input = {
            grants: ['client_credentials'],
            userID: adminUser.id,
            description: 'DB fail',
        }
        const res = await server.executeOperation({
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
                findUser: async () => new Error('User not found'),
            },
        })
        const input = {
            grants: ['client_credentials'],
            userID: 'invalid-user-id',
            description: 'Should fail',
        }
        const res = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/User with ID invalid-user-id does not exist/)
    })

    it('creates an oauth client with required fields', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        const res = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Test client',
                    grants: ['client_credentials'],
                    userID: adminUser.id,
                },
            },
        })
        expect(res.errors).toBeUndefined()
        expect(res.data?.createOauthClient.oauthClient).toBeDefined()
    })
})
