import type { Context } from '../handlers/apollo_gql'

/**
 * Checks if the context represents an OAuth client with client_credentials grant
 */
export function isOAuthClientCredentials(context: Context): boolean {
    return !!(
        context.oauthClient?.isOAuthClient &&
        context.oauthClient?.grants.includes('client_credentials')
    )
}

/**
 * Checks if the current context can read data
 * OAuth clients must have client_credentials grant to read
 */
export function canRead(context: Context): boolean {
    // If this is an OAuth client, check if it has client_credentials
    if (context.oauthClient?.isOAuthClient) {
        return isOAuthClientCredentials(context)
    }

    // Regular authenticated users can read
    return true
}

/**
 * Checks if the current context can write data
 * OAuth clients cannot write, only read
 */
export function canWrite(context: Context): boolean {
    // OAuth clients cannot write
    if (context.oauthClient?.isOAuthClient) {
        return false
    }

    // Regular users can write (subject to role-specific restrictions in resolvers)
    return true
}

/**
 * Gets information about the current authorization context for logging/auditing
 */
export function getAuthContextInfo(context: Context): {
    isOAuthClient: boolean
    clientId?: string
    userId: string
    userRole: string
    grants?: string[]
} {
    const { user, oauthClient } = context

    return {
        isOAuthClient: !!oauthClient?.isOAuthClient,
        clientId: oauthClient?.clientId,
        userId: user.id,
        userRole: user.role,
        grants: oauthClient?.grants,
    }
}
