import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    FetchOauthClientsDocument,
} from '../../gen/gqlClient'

describe('fetchOauthClients', () => {
    it('fetches all OAuth clients as ADMIN', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create two clients
        await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Client 1',
                    grants: ['client_credentials'],
                    userID: adminUser.id,
                },
            },
        })
        await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Client 2',
                    grants: ['client_credentials'],
                    userID: adminUser.id,
                },
            },
        })
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients.length).toBeGreaterThanOrEqual(2)
        // Verify user objects are included
        oauthClients.forEach((client: unknown) => {
            const typedClient = client as {
                user: { id: string; email: string; role: string }
            }
            expect(typedClient.user).toBeDefined()
            expect(typedClient.user.id).toBeDefined()
            expect(typedClient.user.email).toBeDefined()
            expect(typedClient.user.role).toBeDefined()
        })
    })

    it('fetches all OAuth clients as ADMIN with empty input', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        // Fetch all (empty input)
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
            variables: { input: {} },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
    })

    it('fetches only specified clientIds', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create a client
        const createRes = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Specific client',
                    grants: ['client_credentials'],
                    userID: adminUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
            variables: { input: { clientIds: [clientId] } },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients).toHaveLength(1)
        expect(oauthClients[0].clientId).toBe(clientId)
        expect(oauthClients[0].user).toBeDefined()
        expect(oauthClients[0].user.id).toBe(adminUser.id)
    })

    it('returns empty array if no clients match', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
            variables: { input: { clientIds: ['nonexistent'] } },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients).toHaveLength(0)
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(res.errors?.[0].message).toMatch(/not authorized/i)
    })

    it('errors on DB failure', async () => {
        // Use a mock store that throws
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
            store: {
                ...{},
                listOAuthClients: async () => new Error('DB fail'),
                getOAuthClientByClientId: async () => new Error('DB fail'),
            },
        })
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(res.errors?.[0].message).toMatch(/db fail/i)
    })
})
