import { StateUserType, CMSUserType, UserType } from './UserType'

function isUser(user: unknown): user is UserType {
    if (user && typeof user === 'object') {
        if ('role' in user) {
            const roleUser = user as { role: unknown }
            if (typeof roleUser.role === 'string') {
                if (
                    roleUser.role === 'STATE_USER' ||
                    roleUser.role === 'CMS_USER'
                ) {
                    return true
                }
            }
        }
    }

    return false
}

function isStateUser(user: UserType): user is StateUserType {
    return user.role === 'STATE_USER'
}

function isCMSUser(user: UserType): user is CMSUserType {
    return user.role === 'CMS_USER'
}

export { isUser, isCMSUser, isStateUser }
