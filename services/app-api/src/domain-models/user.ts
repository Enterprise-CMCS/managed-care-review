import {
    StateUserType,
    CMSUserType,
    UserType,
    AdminUserType,
    HelpdeskUserType,
} from './UserType'
import { User as PrismaUser } from '@prisma/client'

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

function isAdminUser(user: UserType): user is AdminUserType {
    return user.role === 'ADMIN_USER'
}

function isHelpdeskUser(user: UserType): user is HelpdeskUserType {
    return user.role === 'HELPDESK_USER'
}

function toDomainUser(user: PrismaUser): UserType {
    switch (user.role) {
        case 'ADMIN_USER':
            return user as AdminUserType
        case 'HELPDESK_USER':
            return user as HelpdeskUserType
        case 'CMS_USER':
            return {
                id: user.id,
                role: 'CMS_USER',
                email: user.email,
                givenName: user.givenName,
                familyName: user.familyName,
                divisionAssignment: user.divisionAssignment,
                stateAssignments: [],
            } as CMSUserType
        case 'STATE_USER':
            return user as StateUserType
    }
}

export {
    isUser,
    isCMSUser,
    isStateUser,
    isAdminUser,
    toDomainUser,
    isHelpdeskUser,
}
