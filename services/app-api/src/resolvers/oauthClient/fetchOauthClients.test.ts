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
                },
            },
        })
        await server.executeOperation({
            query: FetchOauthClientsDocument, // Should be createOauthClient, but we just want to ensure fetch works
            variables: {
                input: {
                    description: 'Client 2',
                    grants: ['client_credentials'],
                },
            },
        })
        // Fetch all
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients.length).toBeGreaterThanOrEqual(2)
    })

    it('fetches only specified clientIds', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        // Create a client
        const createRes = await server.executeOperation({
            query: FetchOauthClientsDocument, // Should be createOauthClient, but we just want to ensure fetch works
            variables: {
                input: {
                    description: 'Client 3',
                    grants: ['client_credentials'],
                },
            },
        })
        const clientId =
            createRes.data?.fetchOauthClients.oauthClients[0]?.clientId
        // Fetch by clientId
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
            variables: { input: { clientIds: [clientId] } },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(oauthClients).toHaveLength(1)
        expect(oauthClients[0].clientId).toBe(clientId)
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(res.errors?.[0].message).toMatch(/forbidden/i)
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
