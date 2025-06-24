import type { Context } from '../handlers/apollo_gql'
import type { UserType } from '../domain-models'
import { isStateUser, isCMSUser, hasAdminPermissions } from '../domain-models'

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
 * Checks if the current context can read data (either regular user or OAuth client with credentials)
 */
export function canRead(context: Context): boolean {
    // OAuth clients with client_credentials can read
    if (isOAuthClientCredentials(context)) {
        return true
    }
    
    // Regular authenticated users can read based on their role permissions
    return true // All authenticated users can read something, role-specific restrictions apply per resolver
}

/**
 * Checks if the current context can write data (OAuth clients cannot write)
 */
export function canWrite(context: Context): boolean {
    // OAuth clients cannot write, only read
    if (isOAuthClientCredentials(context)) {
        return false
    }
    
    // Regular users can write based on their role
    return true // Role-specific write restrictions apply per resolver
}

/**
 * Enhanced state access check that considers OAuth client permissions
 * OAuth clients inherit the state access of their associated user
 */
export function canAccessState(context: Context, stateCode: string): boolean {
    const { user } = context
    
    // For OAuth clients, check if their associated user can access the state
    if (isOAuthClientCredentials(context)) {
        // OAuth client inherits the state access permissions of its associated user
        if (isStateUser(user)) {
            return user.stateCode === stateCode
        }
        // CMS users and admins can access all states
        return isCMSUser(user) || hasAdminPermissions(user)
    }
    
    // Regular user state access logic
    if (isStateUser(user)) {
        return user.stateCode === stateCode
    }
    
    // CMS users and admins can access all states
    return isCMSUser(user) || hasAdminPermissions(user)
}

/**
 * Checks if the context has CMS-level permissions
 * OAuth clients inherit CMS permissions from their associated user
 */
export function hasCMSPermissions(context: Context): boolean {
    const { user } = context
    
    // OAuth clients inherit permissions from their associated user
    if (isOAuthClientCredentials(context)) {
        return isCMSUser(user) || hasAdminPermissions(user)
    }
    
    // Regular user CMS permission check
    return isCMSUser(user) || hasAdminPermissions(user)
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