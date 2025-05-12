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
        clientId: 'test-client',
        clientSecret: 'test-secret', // pragma: allowlist secret
        grants: ['client_credentials'],
        description: 'Test client',
        contactEmail: 'test@example.com',
    }

    it('creates and retrieves an OAuth client', async () => {
        const client = await sharedTestPrismaClient()
        const oauthClient = await createOAuthClient(client, testClientData)

        expect(oauthClient).not.toBeInstanceOf(Error)
        if (oauthClient instanceof Error) throw oauthClient

        expect(oauthClient.clientId).toBe(testClientData.clientId)
        expect(oauthClient.description).toBe(testClientData.description)
        expect(oauthClient.contactEmail).toBe(testClientData.contactEmail)
        expect(oauthClient.grants).toEqual(testClientData.grants)
        expect(oauthClient.clientSecret).not.toBe(testClientData.clientSecret) // Should be hashed
    })

    it('retrieves an OAuth client by ID', async () => {
        const client = await sharedTestPrismaClient()
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const retrievedClient = await getOAuthClientById(
            client,
            createdClient.id
        )
        expect(retrievedClient).not.toBeInstanceOf(Error)
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).not.toBeNull()
        expect(retrievedClient?.clientId).toBe(testClientData.clientId)
    })

    it('retrieves an OAuth client by client ID', async () => {
        const client = await sharedTestPrismaClient()
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const retrievedClient = await getOAuthClientByClientId(
            client,
            testClientData.clientId
        )
        expect(retrievedClient).not.toBeInstanceOf(Error)
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).not.toBeNull()
        expect(retrievedClient?.id).toBe(createdClient.id)
    })

    it('verifies client credentials', async () => {
        const client = await sharedTestPrismaClient()
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const isValid = await verifyClientCredentials(
            client,
            testClientData.clientId,
            testClientData.clientSecret
        )
        expect(isValid).not.toBeInstanceOf(Error)
        if (isValid instanceof Error) throw isValid

        expect(isValid).toBe(true)

        const isInvalid = await verifyClientCredentials(
            client,
            testClientData.clientId,
            'wrong-secret'
        )
        expect(isInvalid).not.toBeInstanceOf(Error)
        if (isInvalid instanceof Error) throw isInvalid

        expect(isInvalid).toBe(false)
    })

    it('updates an OAuth client', async () => {
        const client = await sharedTestPrismaClient()
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
        expect(updatedClient).not.toBeInstanceOf(Error)
        if (updatedClient instanceof Error) throw updatedClient

        expect(updatedClient.description).toBe(updateData.description)
        expect(updatedClient.grants).toEqual(updateData.grants)
    })

    it('deletes an OAuth client', async () => {
        const client = await sharedTestPrismaClient()
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const deletedClient = await deleteOAuthClient(client, createdClient.id)
        expect(deletedClient).not.toBeInstanceOf(Error)
        if (deletedClient instanceof Error) throw deletedClient

        const retrievedClient = await getOAuthClientById(
            client,
            createdClient.id
        )
        expect(retrievedClient).not.toBeInstanceOf(Error)
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).toBeNull()
    })

    it('lists all OAuth clients', async () => {
        const client = await sharedTestPrismaClient()

        // Create multiple clients
        const client1 = await createOAuthClient(client, {
            ...testClientData,
            clientId: 'test-client-1',
        })
        if (client1 instanceof Error) throw client1

        const client2 = await createOAuthClient(client, {
            ...testClientData,
            clientId: 'test-client-2',
        })
        if (client2 instanceof Error) throw client2

        const clients = await listOAuthClients(client)
        expect(clients).not.toBeInstanceOf(Error)
        if (clients instanceof Error) throw clients

        expect(clients.length).toBeGreaterThanOrEqual(2)
        expect(clients.some((c) => c.clientId === 'test-client-1')).toBe(true)
        expect(clients.some((c) => c.clientId === 'test-client-2')).toBe(true)
    })

    it('handles non-existent client ID', async () => {
        const client = await sharedTestPrismaClient()
        const retrievedClient = await getOAuthClientById(client, uuidv4())
        expect(retrievedClient).not.toBeInstanceOf(Error)
        if (retrievedClient instanceof Error) throw retrievedClient

        expect(retrievedClient).toBeNull()
    })

    it('handles duplicate client ID', async () => {
        const client = await sharedTestPrismaClient()
        const createdClient = await createOAuthClient(client, testClientData)
        if (createdClient instanceof Error) throw createdClient

        const duplicateClient = await createOAuthClient(client, testClientData)
        expect(duplicateClient).toBeInstanceOf(Error)
    })
})
