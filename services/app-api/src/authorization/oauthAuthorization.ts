import { OAuthScope } from '@prisma/client'
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
 * Checks if the context represents an OAuth client with scopes
 */
export function isOAuthClientScopes(context: Context): boolean {
    return !!(
        context.oauthClient?.isOAuthClient &&
        context.oauthClient?.isDelegatedUser && //do we want to include isDelegatedUser in the logic or no?
        context.oauthClient?.scopes?.includes(OAuthScope.CMS_SUBMISSION_ACTIONS)
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
 * Checks if the current context is an OAuth client with write permissions
 * While majority of endpoints will not support OAuth write requests (canWrite),
 * specific endpoints will allow if the OAuth client has been validated for delegated user
 */
export function oauthCanWrite(context: Context): boolean {
    // OAuth clients can only write if scopes is populated
    if (context.oauthClient?.isOAuthClient) { 
        return isOAuthClientScopes(context)
    }

    // Regular authenticated users can write (subject to role-specific restrictions in resolvers)
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
