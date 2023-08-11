import type { PrismaClient } from '@prisma/client'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError } from '../storeError'
import type { UserType } from '../../domain-models'
import { domainUserFromPrismaUser } from './prismaDomainUser'

export async function findUser(
    client: PrismaClient,
    id: string
): Promise<UserType | StoreError | undefined> {
    try {
        const findResult = await client.user.findUnique({
            where: {
                id: id,
            },
            include: {
                stateAssignments: {},
            },
        })

        if (!findResult) {
            return undefined
        }

        return domainUserFromPrismaUser(findResult)
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
