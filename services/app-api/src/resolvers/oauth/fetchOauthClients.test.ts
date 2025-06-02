import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'
import {
    FetchOauthClientsDocument,
    CreateOauthClientDocument,
} from '../../gen/gqlClient'

describe('fetchOauthClientsResolver', () => {
    it('fetches all OAuth clients as admin', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create a client first
        const createInput = {
            description: 'Test client',
            contactEmail: 'test@example.com',
            grants: ['client_credentials'],
        }
        const createResult = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input: createInput },
        })
        expect(createResult.errors).toBeUndefined()
        const fetchResult = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(fetchResult.errors).toBeUndefined()
        const clients = fetchResult.data?.fetchOauthClients?.edges
        expect(clients.length).toBeGreaterThan(0)
        expect(clients[0].node.clientId).toBeDefined()
    })

    it('fetches specific OAuth client by clientId', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create a client first
        const createInput = {
            description: 'Test client',
            contactEmail: 'test@example.com',
            grants: ['client_credentials'],
        }
        const createResult = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input: createInput },
        })
        expect(createResult.errors).toBeUndefined()
        const clientId =
            createResult.data?.createOauthClient?.oauthClient?.clientId
        expect(clientId).toBeDefined()
        const fetchResult = await server.executeOperation({
            query: FetchOauthClientsDocument,
            variables: { input: { clientIds: [clientId] } },
        })
        expect(fetchResult.errors).toBeUndefined()
        const clients = fetchResult.data?.fetchOauthClients?.edges
        expect(clients).toHaveLength(1)
        expect(clients[0].node.clientId).toBe(clientId)
    })

    it('returns ForbiddenError for non-admin user', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const fetchResult = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(fetchResult.errors).toBeDefined()
        expect(fetchResult.errors?.[0].message).toMatch(/not authorized/i)
    })

    it('returns all clients if input is missing or null', async () => {
        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create a client first
        const createInput = {
            description: 'Test client',
            contactEmail: 'test@example.com',
            grants: ['client_credentials'],
        }
        await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: { input: createInput },
        })
        // Call fetchOauthClients with no input
        const fetchResult = await server.executeOperation({
            query: FetchOauthClientsDocument,
            variables: {},
        })
        expect(fetchResult.errors).toBeUndefined()
        const clients = fetchResult.data?.fetchOauthClients?.edges
        expect(clients).toBeDefined()
        expect(clients.length).toBeGreaterThan(0)
    })
})
