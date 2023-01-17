type LocalUserType = LocalStateUserType | LocalCMSUserType

type LocalStateUserType = {
    role: 'STATE_USER'
    email: string
    name: string
    stateCode: string
}

type LocalCMSUserType = {
    role: 'CMS_USER'
    email: string
    name: string
}

function isLocalUser(user: unknown): user is LocalUserType {
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

export type { LocalUserType }

export { isLocalUser }
