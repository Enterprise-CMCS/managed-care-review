import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    FetchOauthClientsDocument,
} from '../../gen/gqlClient'

describe('fetchOauthClients', () => {
    it('fetches all OAuth clients as ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        // Create two clients
        await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Client 1',
                    grants: ['client_credentials'],
                    contactEmail: 'client1@example.com',
                },
            },
        })
        await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Client 2',
                    grants: ['client_credentials'],
                    contactEmail: 'client2@example.com',
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
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        // Create a client
        const createRes = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Specific client',
                    grants: ['client_credentials'],
                    contactEmail: 'specific@example.com',
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
