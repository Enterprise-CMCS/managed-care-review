import { OAuthScope } from '../generated/client'
import type { Context } from '../handlers/apollo_gql'
import type { UserRoles } from '../domain-models/UserType'

/**
 * context.oauthClient:
 * Only exists for OAuth-authenticated requests.
 * Undefined for non-OAuth requests.
 */

// Admin users cannot be delegated users. Admin OAuth requests must use the
// OAuth client's attached admin user directly.
export const validDelegatedUserRoles: UserRoles[] = [
    'CMS_USER',
    'CMS_APPROVER_USER',
]

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
    const stageName = process.env.stage
    // OAuth clients can only write if scopes is populated
    // and we are temporarily restricting them from writing in prod
    if (context.oauthClient) {
        if (
            stageName !== 'prod' &&
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
 * Checks if the current context is allowed to perform admin OAuth writes.
 *
 * Admin OAuth writes cannot be delegated. The OAuth client itself must have the
 * admin scope and the request must not include an acting/delegated user.
 */
export function canOauthAdminWrite(context: Context): boolean {
    if (context.oauthClient) {
        return !!(
            !context.oauthClient.isDelegatedUser &&
            context.oauthClient.scopes?.includes(
                OAuthScope.ADMIN_SUBMISSION_ACTIONS
            )
        )
    }

    return true
}
