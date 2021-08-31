import { CognitoStateUserType, CognitoUserType } from './cognitoUserType'

export function isCognitoUser(user: unknown): user is CognitoUserType {
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

export function isStateUser(
    user: CognitoUserType
): user is CognitoStateUserType {
    return user.role === 'STATE_USER'
}
