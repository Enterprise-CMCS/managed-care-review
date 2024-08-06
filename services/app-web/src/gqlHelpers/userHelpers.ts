import {User, CmsUser, CmsApproverUser, AdminUser, BusinessOwnerUser, HelpdeskUser} from '../gen/gqlClient'
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

export {
    hasCMSUserPermissions,
    hasAdminUserPermissions
}
