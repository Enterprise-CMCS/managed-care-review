import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import { CreateOauthClientDocument } from '../../gen/gqlClient'

describe('createOauthClient', () => {
    it('creates a new OAuth client as ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const input = {
            grants: ['client_credentials', 'refresh_token'],
            description: 'Test client',
            contactEmail: 'test@example.com',
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
        expect(oauthClient.contactEmail).toBe(input.contactEmail)
    })

    it('defaults to ["client_credentials"] if no grants provided', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const input = {
            description: 'No grants',
            contactEmail: 'no@grants.com',
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
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const input = {
            grants: ['client_credentials'],
            contactEmail: 'test@fail.com',
            description: 'Should fail',
        }
        const res = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/forbidden/i)
    })

    it('errors on DB failure', async () => {
        // Use a mock store that throws
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
            store: {
                ...{},
                createOAuthClient: async () => new Error('DB fail'),
            },
        })
        const input = {
            grants: ['client_credentials'],
            contactEmail: 'fail@db.com',
            description: 'DB fail',
        }
        const res = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/db fail/i)
    })

    it('creates an oauth client with required fields', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const res = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Test client',
                    grants: ['client_credentials'],
                    contactEmail: 'test@example.com',
                },
            },
        })
        expect(res.errors).toBeUndefined()
        expect(res.data?.createOauthClient.oauthClient).toBeDefined()
    })
})
