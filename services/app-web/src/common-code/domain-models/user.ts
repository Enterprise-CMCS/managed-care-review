import { User as UserType } from '../../gen/gqlClient'

export interface StateUserType extends UserType {
    role: 'STATE_USER';
  }

export function isUser(user: unknown): user is UserType {
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
