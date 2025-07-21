import type { ExtendedPrismaClient } from '../prismaClient'
import type { Prisma } from '@prisma/client'
import type { UserType } from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'
import { randomBytes } from 'crypto'
import { domainUserFromPrismaUser } from '../user/prismaDomainUser'

type OAuthClientWithUser = Omit<
    Prisma.OAuthClientGetPayload<{
        include: { user: { include: { stateAssignments: true } } }
    }>,
    'user'
> & {
    user: UserType
}

// Create a new OAuth client
export async function createOAuthClient(
    client: ExtendedPrismaClient,
    data: {
        grants?: string[]
        description?: string
        userID: string
    }
): Promise<OAuthClientWithUser | Error> {
    try {
        const clientId = `oauth-client-${uuidv4()}`
        const clientSecret = randomBytes(64).toString('base64url')
        const grants =
            data.grants && data.grants.length > 0
                ? data.grants
                : ['client_credentials']
        const prismaResult = await client.oAuthClient.create({
            data: {
                clientId,
                clientSecret,
                grants,
                description: data.description,
                userID: data.userID,
            },
            include: {
                user: { include: { stateAssignments: true } },
            },
        })

        const domainUser = domainUserFromPrismaUser(prismaResult.user)
        if (domainUser instanceof Error) {
            return domainUser
        }

        return {
            ...prismaResult,
            user: domainUser,
        }
    } catch (error) {
        return error as Error
    }
}

// Get an OAuth client by ID
export async function getOAuthClientById(
    client: ExtendedPrismaClient,
    id: string
): Promise<OAuthClientWithUser | null | Error> {
    try {
        const prismaResult = await client.oAuthClient.findUnique({
            where: { id },
            include: { user: { include: { stateAssignments: true } } },
        })
        if (!prismaResult) {
            return null
        }

        const domainUser = domainUserFromPrismaUser(prismaResult.user)
        if (domainUser instanceof Error) {
            return domainUser
        }

        return {
            ...prismaResult,
            user: domainUser,
        }
    } catch (error) {
        return error as Error
    }
}

// Get an OAuth client by client ID
export async function getOAuthClientByClientId(
    client: ExtendedPrismaClient,
    clientId: string
): Promise<OAuthClientWithUser | null | Error> {
    try {
        const prismaResult = await client.oAuthClient.findUnique({
            where: { clientId },
            include: { user: { include: { stateAssignments: true } } },
        })
        if (!prismaResult) {
            return null
        }
        const domainUser = domainUserFromPrismaUser(prismaResult.user)
        if (domainUser instanceof Error) {
            return domainUser
        }

        return {
            ...prismaResult,
            user: domainUser,
        }
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
): Promise<OAuthClientWithUser | Error> {
    try {
        const prismaResult = await client.oAuthClient.update({
            where: { clientId },
            data,
            include: {
                user: { include: { stateAssignments: true } },
            },
        })
        const domainUser = domainUserFromPrismaUser(prismaResult.user)
        if (domainUser instanceof Error) {
            return domainUser
        }

        return {
            ...prismaResult,
            user: domainUser,
        }
    } catch (error) {
        return error as Error
    }
}

// Delete an OAuth client
export async function deleteOAuthClient(
    client: ExtendedPrismaClient,
    clientId: string
): Promise<OAuthClientWithUser | Error> {
    try {
        // Check if client exists first
        const existingClient = await client.oAuthClient.findUnique({
            where: { clientId },
        })
        if (!existingClient) {
            return new Error('OAuth client not found')
        }

        const prismaResult = await client.oAuthClient.delete({
            where: { clientId },
            include: {
                user: { include: { stateAssignments: true } },
            },
        })
        const domainUser = domainUserFromPrismaUser(prismaResult.user)
        if (domainUser instanceof Error) {
            return domainUser
        }

        return {
            ...prismaResult,
            user: domainUser,
        }
    } catch (error) {
        return error as Error
    }
}

// List all OAuth clients
export async function listOAuthClients(
    client: ExtendedPrismaClient
): Promise<OAuthClientWithUser[] | Error> {
    try {
        const prismaResults = await client.oAuthClient.findMany({
            include: { user: { include: { stateAssignments: true } } },
        })
        const domainResults: OAuthClientWithUser[] = []

        for (const prismaResult of prismaResults) {
            const domainUser = domainUserFromPrismaUser(prismaResult.user)
            if (domainUser instanceof Error) {
                return domainUser
            }
            domainResults.push({
                ...prismaResult,
                user: domainUser,
            })
        }

        return domainResults
    } catch (error) {
        return error as Error
    }
}

// Get OAuth clients by user ID
export async function getOAuthClientsByUserId(
    client: ExtendedPrismaClient,
    userID: string
): Promise<OAuthClientWithUser[] | Error> {
    try {
        const prismaResults = await client.oAuthClient.findMany({
            where: { userID },
            include: { user: { include: { stateAssignments: true } } },
        })
        const domainResults: OAuthClientWithUser[] = []

        for (const prismaResult of prismaResults) {
            const domainUser = domainUserFromPrismaUser(prismaResult.user)
            if (domainUser instanceof Error) {
                return domainUser
            }
            domainResults.push({
                ...prismaResult,
                user: domainUser,
            })
        }

        return domainResults
    } catch (error) {
        return error as Error
    }
}

export type { OAuthClientWithUser }
