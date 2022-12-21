import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'
import { PrismaClient } from '@prisma/client'
import { UserType, StateType } from '../domain-models'

export async function updateUserAssignedState(
    client: PrismaClient,
    userID: string,
    state: StateType
): Promise<UserType | StoreError> {
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
