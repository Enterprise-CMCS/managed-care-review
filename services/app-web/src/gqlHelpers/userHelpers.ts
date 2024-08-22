import {User, CmsUser, CmsApproverUser, AdminUser, BusinessOwnerUser, HelpdeskUser, UpdatedBy} from '../gen/gqlClient'
const hasCMSUserPermissions = (user?: User): user is CmsUser | CmsApproverUser => {
    if (!user) {
        return false
    }

    const validRoles = [
        'CMS_USER',
        'CMS_APPROVER_USER'
    ]

    return validRoles.includes(user.role)
}

const hasAdminUserPermissions = (user?: User): user is AdminUser | BusinessOwnerUser | HelpdeskUser => {
    if (!user) {
        return false
    }

    const validRoles = [
        'ADMIN_USER',
        'BUSINESSOWNER_USER',
        'HELPDESK_USER'
    ]

    return validRoles.includes(user.role)
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
    getUpdatedByDisplayName
}
