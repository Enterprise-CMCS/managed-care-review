import {
    User,
    CmsUser,
    CmsApproverUser,
    AdminUser,
    BusinessOwnerUser,
    HelpdeskUser,
    ReadOnlyUser,
    UpdatedBy,
} from '../gen/gqlClient'
const hasCMSUserPermissions = (
    user?: User
): user is CmsUser | CmsApproverUser => {
    if (!user) {
        return false
    }

    const validRoles = ['CMS_USER', 'CMS_APPROVER_USER']

    return validRoles.includes(user.role)
}

const hasAdminUserPermissions = (
    user?: User
): user is AdminUser | BusinessOwnerUser | HelpdeskUser => {
    if (!user) {
        return false
    }

    const validRoles = ['ADMIN_USER', 'BUSINESSOWNER_USER', 'HELPDESK_USER']

    return validRoles.includes(user.role)
}

const hasReadOnlyUserPermissions = (user?: User): user is ReadOnlyUser => {
    if (!user) {
        return false
    }

    return user.role === 'READONLY_USER'
}

// Users who view CMS-side data (all submissions, questions, etc.). This
// includes read-only users, who can see everything a CMS reviewer sees but
// cannot trigger any mutation. Use hasCMSUserPermissions (not this helper) to
// gate write/action affordances.
const canViewCMSData = (
    user?: User
): user is CmsUser | CmsApproverUser | ReadOnlyUser => {
    return hasCMSUserPermissions(user) || hasReadOnlyUserPermissions(user)
}

// process user that made the change history event.
const getUpdatedByDisplayName = (updatedBy?: UpdatedBy): string | undefined => {
    if (!updatedBy) {
        return 'Not available'
    } else if (updatedBy.role === 'ADMIN_USER') {
        return 'Administrator'
    } else {
        return updatedBy.email
    }
}

export {
    hasCMSUserPermissions,
    hasAdminUserPermissions,
    hasReadOnlyUserPermissions,
    canViewCMSData,
    getUpdatedByDisplayName,
}
