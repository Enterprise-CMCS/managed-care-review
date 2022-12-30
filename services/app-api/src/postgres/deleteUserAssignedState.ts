import { convertPrismaErrorToStoreError, StoreError } from './storeError'
import { PrismaClient } from '@prisma/client'
import {
    AdminUserType,
    CMSUserType,
    UserType,
    StateUserType,
} from '../domain-models'

export async function deleteUserAssignedState(
    client: PrismaClient,
    userID: string,
    stateCode: string
): Promise<UserType | StoreError> {
    try {
        const updateResult = await client.user.update({
            where: {
                id: userID,
            },
            data: {
                states: {
                    deleteMany: [{ stateCode: stateCode }],
                },
            },
        })
        switch (updateResult.role) {
            case 'ADMIN_USER':
                return updateResult as AdminUserType
            case 'CMS_USER':
                return updateResult as CMSUserType
            case 'STATE_USER':
                return updateResult as StateUserType
        }
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
