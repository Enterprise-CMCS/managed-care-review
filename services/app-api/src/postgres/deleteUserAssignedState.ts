import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'
import { PrismaClient } from '@prisma/client'
import { UserType } from '../domain-models'

export async function deleteUserAssignedState(
    client: PrismaClient,
    userID: string,
    stateCode: string
): Promise<UserType | StoreError> {
    try {
        const updateResult = client.user.update({
            where: {
                id: userID,
            },
            data: {
                states: {
                    deleteMany: [{ stateCode: stateCode }],
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
