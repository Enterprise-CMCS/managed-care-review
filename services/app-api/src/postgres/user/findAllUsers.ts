import type { PrismaClient } from '@prisma/client'
import type { UserType } from '../../domain-models'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError } from '../storeError'
import { parseDomainUsersFromPrismaUsers } from './prismaDomainUser'

export async function findAllUsers(
    client: PrismaClient
): Promise<UserType[] | StoreError> {
    try {
        const allUsers = await client.user.findMany({
            include: {
                stateAssignments: true,
            },
            orderBy: {
                familyName: 'asc',
            },
        })

        const domainUserResults = parseDomainUsersFromPrismaUsers(allUsers)

        if (domainUserResults instanceof Error) {
            return {
                code: 'USER_FORMAT_ERROR',
                message: domainUserResults.message,
            }
        }

        return domainUserResults
    } catch (err) {
        console.error(err)
        return convertPrismaErrorToStoreError(err)
    }
}
