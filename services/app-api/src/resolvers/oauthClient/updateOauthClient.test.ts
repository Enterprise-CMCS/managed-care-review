import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import { UpdateOauthClientDocument } from '../../gen/gqlClient'

describe('updateOauthClient', () => {
    it('updates an OAuth client as ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const input = {
            id: 'test-id',
            description: 'Updated description',
            contactEmail: 'updated@example.com',
            grants: ['client_credentials', 'refresh_token'],
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.updateOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient.description).toBe(input.description)
        expect(oauthClient.contactEmail).toBe(input.contactEmail)
        expect(oauthClient.grants).toEqual(expect.arrayContaining(input.grants))
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const input = {
            id: 'test-id',
            description: 'Should fail',
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/not authorized/i)
    })

    it('errors if client not found', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const input = {
            id: 'non-existent-id',
            description: 'Should fail',
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/not found/i)
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
            id: 'test-id',
            description: 'DB fail',
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/db fail/i)
    })
})
