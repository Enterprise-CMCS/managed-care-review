import { CognitoUserType } from './cognitoUserType'

export function isCognitoUser(user: unknown): user is CognitoUserType {
    if (user && typeof user === 'object') {
        if ('role' in user) {
            const roleUser = user as { role: unknown }
            if (typeof roleUser.role === 'string') {
                if (
                    roleUser.role === 'STATE_USER' ||
                    roleUser.role === 'ADMIN'
                ) {
                    return true
                }
            }
        }
    }

    return false
}
