import { OAuthScope } from '@prisma/client'
import type { Context } from '../handlers/apollo_gql'

/**
 * context.oauthClient:
 * Only exists for OAuth-authenticated requests.
 * Undefined for non-OAuth requests.
 */

/**
 * Checks if the context represents an OAuth client with client_credentials grant
 */
export function isOAuthClientCredentials(context: Context): boolean {
    return !!(
        context.oauthClient &&
        context.oauthClient.grants.includes('client_credentials')
    )
}

/**
 * Checks if the current context can read data
 * OAuth clients must have client_credentials grant to read
 */
export function canRead(context: Context): boolean {
    // If this is an OAuth client, check if it has client_credentials
    if (context.oauthClient) {
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
    if (context.oauthClient) {
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
export function canOauthWrite(context: Context): boolean {
    // OAuth clients can only write if scopes is populated
    if (context.oauthClient) {
        if (
            context.oauthClient?.isDelegatedUser &&
            context.oauthClient?.scopes?.includes(
                OAuthScope.CMS_SUBMISSION_ACTIONS
            )
        ) {
            return true
        } else {
            return false
        }
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
        isOAuthClient: !!oauthClient,
        clientId: oauthClient?.clientId,
        userId: user.id,
        userRole: user.role,
        grants: oauthClient?.grants,
    }
}
