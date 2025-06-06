import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import {
    createOAuthClient,
    getOAuthClientById,
    getOAuthClientByClientId,
    verifyClientCredentials,
    updateOAuthClient,
    deleteOAuthClient,
    listOAuthClients,
} from './oauthClientStore'

describe('OAuthClient Store', () => {
    const testClientData = {
        grants: ['client_credentials'],
        description: 'Test client',
        contactEmail: 'test@example.com',
    }

    let client: Awaited<ReturnType<typeof sharedTestPrismaClient>>

    beforeEach(async () => {
        client = await sharedTestPrismaClient()
        // Clean up any existing OAuth clients before each test
        await client.oAuthClient.deleteMany()
    })

    it('creates and retrieves an OAuth client', async () => {
        const oauthClient = await createOAuthClient(client, testClientData)
        if (oauthClient instanceof Error) throw oauthClient
        expect(oauthClient.clientId).toMatch(/^oauth-client-/)
        expect(oauthClient.clientSecret).toHaveLength(86)
        expect(oauthClient.description).toBe(testClientData.description)
        expect(oauthClient.contactEmail).toBe(testClientData.contactEmail)
        expect(oauthClient.grants).toEqual(testClientData.grants)
    })

    it('retrieves an OAuth client by ID', async () => {
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const retrievedClient = await getOAuthClientById(
            client,
            createdClient.id
        )
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).not.toBeNull()
        expect(retrievedClient?.clientId).toBe(createdClient.clientId)
    })

    it('retrieves an OAuth client by client ID', async () => {
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const retrievedClient = await getOAuthClientByClientId(
            client,
            createdClient.clientId
        )
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).not.toBeNull()
        expect(retrievedClient?.id).toBe(createdClient.id)
    })

    it('verifies client credentials', async () => {
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const isValid = await verifyClientCredentials(
            client,
            createdClient.clientId,
            createdClient.clientSecret
        )
        if (isValid instanceof Error) throw isValid

        expect(isValid).toBe(true)

        const isInvalid = await verifyClientCredentials(
            client,
            createdClient.clientId,
            'wrong-secret'
        )
        if (isInvalid instanceof Error) throw isInvalid

        expect(isInvalid).toBe(false)
    })

    it('updates an OAuth client', async () => {
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const updateData = {
            description: 'Updated description',
            grants: ['client_credentials', 'password'],
        }

        const updatedClient = await updateOAuthClient(
            client,
            createdClient.id,
            updateData
        )
        if (updatedClient instanceof Error) throw updatedClient

        expect(updatedClient.description).toBe(updateData.description)
        expect(updatedClient.grants).toEqual(updateData.grants)
        expect(updatedClient.updatedAt).toBeDefined()
        expect(updatedClient.updatedAt.getTime()).toBeGreaterThan(
            createdClient.updatedAt.getTime()
        )
    })

    it('deletes an OAuth client', async () => {
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const deletedClient = await deleteOAuthClient(client, createdClient.id)
        if (deletedClient instanceof Error) throw deletedClient

        const retrievedClient = await getOAuthClientById(
            client,
            createdClient.id
        )
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).toBeNull()
    })

    it('lists all OAuth clients', async () => {
        // Create multiple clients
        const client1 = await createOAuthClient(client, testClientData)
        if (client1 instanceof Error) throw client1
        const client2 = await createOAuthClient(client, testClientData)
        if (client2 instanceof Error) throw client2
        const clients = await listOAuthClients(client)
        if (clients instanceof Error) throw clients
        expect(clients.length).toBeGreaterThanOrEqual(2)
        expect(clients.some((c) => c.clientId === client1.clientId)).toBe(true)
        expect(clients.some((c) => c.clientId === client2.clientId)).toBe(true)
    })

    it('handles non-existent client ID', async () => {
        const retrievedClient = await getOAuthClientById(client, uuidv4())
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).toBeNull()
    })

    it('should update updatedAt when client is updated', async () => {
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        // Add a delay to ensure updatedAt is different
        await new Promise((r) => setTimeout(r, 2))

        const updatedClient = await updateOAuthClient(
            client,
            createdClient.id,
            { description: 'new desc' }
        )
        if (updatedClient instanceof Error) throw updatedClient

        expect(updatedClient.updatedAt.getTime()).toBeGreaterThanOrEqual(
            createdClient.updatedAt.getTime()
        )
    })
})
