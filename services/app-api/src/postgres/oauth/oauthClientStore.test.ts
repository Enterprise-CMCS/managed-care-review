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
    getOAuthClientsByUserId,
} from './oauthClientStore'

describe('OAuthClient Store', () => {
    let testUserId: string
    let testClientData: {
        grants: string[]
        description: string
        contactEmail: string
        userID: string
    }

    let client: Awaited<ReturnType<typeof sharedTestPrismaClient>>

    beforeEach(async () => {
        client = await sharedTestPrismaClient()
        // Clean up any existing OAuth clients before each test
        await client.oAuthClient.deleteMany()

        // Find or create a test user
        let testUser = await client.user.findFirst({
            where: {
                email: 'testuser@example.com',
                role: 'ADMIN_USER',
            },
        })

        if (!testUser) {
            testUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'testuser@example.com',
                    role: 'ADMIN_USER',
                },
            })
        }
        testUserId = testUser.id

        testClientData = {
            grants: ['client_credentials'],
            description: 'Test client',
            contactEmail: 'test@example.com',
            userID: testUserId,
        }
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
            createdClient.clientId,
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

        const deletedClient = await deleteOAuthClient(
            client,
            createdClient.clientId
        )
        if (deletedClient instanceof Error) throw deletedClient

        const retrievedClient = await getOAuthClientByClientId(
            client,
            createdClient.clientId
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
            createdClient.clientId,
            { description: 'new desc' }
        )
        if (updatedClient instanceof Error) throw updatedClient

        expect(updatedClient.updatedAt.getTime()).toBeGreaterThanOrEqual(
            createdClient.updatedAt.getTime()
        )
    })

    it('retrieves OAuth clients by user ID', async () => {
        // Create two clients for the same user
        const client1 = await createOAuthClient(client, testClientData)
        if (client1 instanceof Error) throw client1

        const client2 = await createOAuthClient(client, {
            ...testClientData,
            description: 'Second test client',
        })
        if (client2 instanceof Error) throw client2

        // Find or create another user and client
        let otherUser = await client.user.findFirst({
            where: {
                email: 'otheruser@example.com',
                role: 'STATE_USER',
            },
        })

        if (!otherUser) {
            otherUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Other',
                    familyName: 'User',
                    email: 'otheruser@example.com',
                    role: 'STATE_USER',
                },
            })
        }

        const otherUserClient = await createOAuthClient(client, {
            ...testClientData,
            userID: otherUser.id,
            description: 'Other user client',
        })
        if (otherUserClient instanceof Error) throw otherUserClient

        // Get clients for first user
        const userClients = await getOAuthClientsByUserId(client, testUserId)
        if (userClients instanceof Error) throw userClients

        expect(userClients).toHaveLength(2)
        expect(userClients.map((c) => c.id)).toContain(client1.id)
        expect(userClients.map((c) => c.id)).toContain(client2.id)
        expect(userClients.map((c) => c.id)).not.toContain(otherUserClient.id)

        // Verify user relationship is included
        expect(userClients[0].user).toBeDefined()
        expect(userClients[0].user.id).toBe(testUserId)
    })
})
