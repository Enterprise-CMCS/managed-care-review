import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'
import { PrismaClient, User, State } from '@prisma/client'

export async function updateUserAssignedState(
    client: PrismaClient,
    userID: string,
    state: State
): Promise<User | StoreError> {
    try {
        const updateResult = client.user.update({
            where: {
                id: userID,
            },
            data: {
                states: {
                    create: [state],
                },
            },
        })

        if (isStoreError(updateResult)) {
            return updateResult
        }

        return updateResult
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
