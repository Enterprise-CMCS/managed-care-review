import type { User, State } from '@prisma/client'
import type { UserType } from '../../domain-models'

// We are storing all the possible values for any of the user types in the same
// table in prisma, so we need to parse those into valid UserTypes or error if something
// got stored wrong.
function domainUserFromPrismaUser(
    prismaUser: User & { stateAssignments?: State[] }
): UserType | Error {
    const divisionAssignment = prismaUser.divisionAssignment ?? undefined
    switch (prismaUser.role) {
        case 'STATE_USER':
            if (!prismaUser.stateCode) {
                return new Error(
                    `StateUser has no stateCode; id: ${prismaUser.id}`
                )
            }

            return {
                id: prismaUser.id,
                role: 'STATE_USER',
                givenName: prismaUser.givenName,
                familyName: prismaUser.familyName,
                email: prismaUser.email,
                stateCode: prismaUser.stateCode,
            }
        case 'CMS_USER':
            if (!prismaUser.stateAssignments) {
                return new Error(
                    `CMSUser has no states array, probably a programming error; id: ${prismaUser.id}`
                )
            }

            return {
                id: prismaUser.id,
                role: 'CMS_USER',
                givenName: prismaUser.givenName,
                familyName: prismaUser.familyName,
                email: prismaUser.email,
                stateAssignments: prismaUser.stateAssignments,
                divisionAssignment: divisionAssignment,
            }
        case 'CMS_APPROVER_USER':
            if (!prismaUser.stateAssignments) {
                return new Error(
                    `CMSUser has no states array, probably a programming error; id: ${prismaUser.id}`
                )
            }

            return {
                id: prismaUser.id,
                role: 'CMS_APPROVER_USER',
                givenName: prismaUser.givenName,
                familyName: prismaUser.familyName,
                email: prismaUser.email,
                stateAssignments: prismaUser.stateAssignments,
                divisionAssignment: divisionAssignment,
            }
        case 'ADMIN_USER':
            return {
                id: prismaUser.id,
                role: 'ADMIN_USER',
                givenName: prismaUser.givenName,
                familyName: prismaUser.familyName,
                email: prismaUser.email,
            }
        case 'HELPDESK_USER':
            return {
                id: prismaUser.id,
                role: 'HELPDESK_USER',
                givenName: prismaUser.givenName,
                familyName: prismaUser.familyName,
                email: prismaUser.email,
            }
        case 'BUSINESSOWNER_USER':
            return {
                id: prismaUser.id,
                role: 'BUSINESSOWNER_USER',
                givenName: prismaUser.givenName,
                familyName: prismaUser.familyName,
                email: prismaUser.email,
            }
    }
}

function parseDomainUsersFromPrismaUsers(
    prismaUsers: (User & { stateAssignments?: State[] })[]
): UserType[] | Error {
    const users: UserType[] = []
    const errors: Error[] = []
    for (const prismaUser of prismaUsers) {
        const result = domainUserFromPrismaUser(prismaUser)
        if (result instanceof Error) {
            errors.push(result)
        } else {
            users.push(result)
        }
    }

    if (errors.length > 0) {
        const msg = `Some of the fetched users did not have all their required fields in the db: ${errors
            .map((e) => e.message)
            .join(', ')}`
        return new Error(msg)
    }

    return users
}

export { parseDomainUsersFromPrismaUsers, domainUserFromPrismaUser }
