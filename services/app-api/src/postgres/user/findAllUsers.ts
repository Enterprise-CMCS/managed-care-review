import { PrismaClient, User, State } from '@prisma/client'
import { UserType } from '../../domain-models'
import { convertPrismaErrorToStoreError, StoreError } from '../storeError'

function parseDomainUsersFromPrismaUsers(
    prismaUsers: (User & { states?: State[] })[]
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
        return new Error(
            `Some of the fetched users did not have all their required fields in the db: ${errors
                .map((e) => e.message)
                .join(', ')}`
        )
    }

    return users
}

// We are storing all the possible values for any of the user types in the same
// table in prisma, so we need to parse those into valid UserTypes or error if something
// got stored wrong.
function domainUserFromPrismaUser(
    prismaUser: User & { states?: State[] }
): UserType | Error {
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
            if (!prismaUser.states) {
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
                stateAssignments: prismaUser.states,
            }
        case 'ADMIN_USER':
            return {
                id: prismaUser.id,
                role: 'ADMIN_USER',
                givenName: prismaUser.givenName,
                familyName: prismaUser.familyName,
                email: prismaUser.email,
            }
    }
}

export async function findAllUsers(
    client: PrismaClient
): Promise<UserType[] | StoreError> {
    try {
        const allUsers = await client.user.findMany({
            include: {
                states: true,
            },
            orderBy: {
                familyName: 'asc',
            },
        })

        const domainUserResults = parseDomainUsersFromPrismaUsers(allUsers)

        if (domainUserResults instanceof Error) {
            return {
                code: 'WRONG_STATUS',
                message: domainUserResults.message,
            }
        }

        return domainUserResults
    } catch (err) {
        console.error(err)
        return convertPrismaErrorToStoreError(err)
    }
}
