
/**
 * Returns the OAuth scopes a user role can be assigned.
 *
 * Scope values intentionally stay as strings here so callers can type them
 * with their generated GraphQL OAuthScope type.
 */
export const getAvailableOAuthScopesForUserRole = (
    userRole?: string
): string[] => {
    if (userRole === 'ADMIN_USER') {
        return ['ADMIN_SUBMISSION_ACTIONS']
    }

    if (userRole === 'CMS_USER' || userRole === 'CMS_APPROVER_USER') {
        return ['CMS_SUBMISSION_ACTIONS']
    }

    return []
}
