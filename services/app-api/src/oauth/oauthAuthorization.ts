import { OAuthScope } from '../generated/client'
import type { Context } from '../handlers/apollo_gql'
import type { UserRoles } from '../domain-models/UserType'

/**
 * context.oauthClient:
 * Only exists for OAuth-authenticated requests.
 * Undefined for non-OAuth requests.
 */

const delegatedOAuthScopes = new Set<string>([
    OAuthScope.CMS_SUBMISSION_ACTIONS,
    OAuthScope.ADMIN_SUBMISSION_ACTIONS,
])

export const validDelegatedUserRoles: UserRoles[] = [
    'CMS_USER',
    'CMS_APPROVER_USER',
    'ADMIN_USER',
]

/**
 * Checks whether a user's role is allowed to receive the requested OAuth scopes.
 */
export function canHaveOAuthScopes(
    userRole: UserRoles,
    scopes: OAuthScope[] | null | undefined
): boolean {
    if (scopes?.includes(OAuthScope.ADMIN_SUBMISSION_ACTIONS)) {
        return userRole === 'ADMIN_USER'
    }

    return true
}

/**
 * Checks whether an OAuth client has any scope that permits delegated requests.
 *
 * This is the broad context-building gate for honoring `x-acting-as-user`.
 * Endpoint-specific authorization still belongs in `canOauthWrite`,
 * `canOauthAdminWrite`, and resolver role checks.
 */
export function hasDelegatedOAuthScope(
    oauthClient: Context['oauthClient']
): boolean {
    return !!oauthClient?.scopes?.some((scope) =>
        delegatedOAuthScopes.has(scope)
    )
}

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
 * Checks if the current context is an OAuth client with admin write permissions.
 */
export function canOauthAdminWrite(context: Context): boolean {
    if (context.oauthClient) {
        return !!(
            context.oauthClient.isDelegatedUser &&
            context.oauthClient.scopes?.includes(
                OAuthScope.ADMIN_SUBMISSION_ACTIONS
            )
        )
    }

    return true
}
