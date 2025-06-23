import type { ExtendedPrismaClient } from '../prismaClient'
import type { Prisma } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { randomBytes } from 'crypto'

type OAuthClientType = Prisma.OAuthClientGetPayload<Record<string, never>>
type OAuthClientWithUserType = Prisma.OAuthClientGetPayload<{
    include: { user: true }
}>

// Create a new OAuth client
export async function createOAuthClient(
    client: ExtendedPrismaClient,
    data: {
        grants?: string[]
        description?: string
        userID: string
    }
): Promise<OAuthClientType | Error> {
    try {
        const clientId = `oauth-client-${uuidv4()}`
        const clientSecret = randomBytes(64).toString('base64url')
        const grants =
            data.grants && data.grants.length > 0
                ? data.grants
                : ['client_credentials']
        return await client.oAuthClient.create({
            data: {
                clientId,
                clientSecret,
                grants,
                description: data.description,
                userID: data.userID,
            },
        })
    } catch (error) {
        return error as Error
    }
}

// Get an OAuth client by ID
export async function getOAuthClientById(
    client: ExtendedPrismaClient,
    id: string
): Promise<OAuthClientWithUserType | null | Error> {
    try {
        return await client.oAuthClient.findUnique({
            where: { id },
            include: { user: true },
        })
    } catch (error) {
        return error as Error
    }
}

// Get an OAuth client by client ID
export async function getOAuthClientByClientId(
    client: ExtendedPrismaClient,
    clientId: string
): Promise<OAuthClientWithUserType | null | Error> {
    try {
        return await client.oAuthClient.findUnique({
            where: { clientId },
            include: { user: true },
        })
    } catch (error) {
        return error as Error
    }
}

// Verify client credentials
export async function verifyClientCredentials(
    client: ExtendedPrismaClient,
    clientId: string,
    clientSecret: string
): Promise<boolean | Error> {
    try {
        const oauthClient = await client.oAuthClient.findUnique({
            where: { clientId },
        })

        if (!oauthClient) {
            return false
        }

        // Update last used timestamp
        await client.oAuthClient.update({
            where: { id: oauthClient.id },
            data: { lastUsedAt: new Date() },
        })

        return clientSecret === oauthClient.clientSecret
    } catch (error) {
        return error as Error
    }
}

// Update an OAuth client
export async function updateOAuthClient(
    client: ExtendedPrismaClient,
    clientId: string,
    data: {
        clientSecret?: string
        grants?: string[]
        description?: string
    }
): Promise<OAuthClientType | Error> {
    try {
        const result = await client.oAuthClient.update({
            where: { clientId },
            data,
        })
        return result
    } catch (error) {
        return error as Error
    }
}

// Delete an OAuth client
export async function deleteOAuthClient(
    client: ExtendedPrismaClient,
    clientId: string
): Promise<OAuthClientType | Error> {
    try {
        // Check if client exists first
        const existingClient = await client.oAuthClient.findUnique({
            where: { clientId },
        })
        if (!existingClient) {
            return new Error('OAuth client not found')
        }

        return await client.oAuthClient.delete({
            where: { clientId },
        })
    } catch (error) {
        return error as Error
    }
}

// List all OAuth clients
export async function listOAuthClients(
    client: ExtendedPrismaClient
): Promise<OAuthClientWithUserType[] | Error> {
    try {
        return await client.oAuthClient.findMany({
            include: { user: true },
        })
    } catch (error) {
        return error as Error
    }
}

// Get OAuth clients by user ID
export async function getOAuthClientsByUserId(
    client: ExtendedPrismaClient,
    userID: string
): Promise<OAuthClientWithUserType[] | Error> {
    try {
        return await client.oAuthClient.findMany({
            where: { userID },
            include: { user: true },
        })
    } catch (error) {
        return error as Error
    }
}
