import { PrismaClient, User } from '@prisma/client'
import { convertPrismaErrorToStoreError, StoreError } from './storeError'

export async function getUser(
    client: PrismaClient,
    id: string
): Promise<User | StoreError> {
    try {
        const findResult = await client.user.findUnique({
            where: {
                id: id,
            },
        })
        return findResult ?? ({} as User)
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
