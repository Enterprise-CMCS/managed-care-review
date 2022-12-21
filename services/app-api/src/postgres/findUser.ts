import { PrismaClient } from '@prisma/client'
import { convertPrismaErrorToStoreError, StoreError } from './storeError'
import { UserType } from '../domain-models'

export async function findUser(
    client: PrismaClient,
    id: string
): Promise<UserType | StoreError> {
    try {
        const findResult = await client.user.findUnique({
            where: {
                id: id,
            },
        })
        return findResult ?? ({} as UserType)
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
