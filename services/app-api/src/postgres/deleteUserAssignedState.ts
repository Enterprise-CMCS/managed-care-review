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
            include: {
                states: true,
            },
        })
        switch (updateResult.role) {
            case 'ADMIN_USER':
                return updateResult as AdminUserType
            case 'CMS_USER':
                return {
                    id: updateResult.id,
                    role: 'CMS_USER',
                    email: updateResult.email,
                    givenName: updateResult.givenName,
                    familyName: updateResult.familyName,
                    stateAssignments: updateResult.states,
                } as CMSUserType
            case 'STATE_USER':
                return updateResult as StateUserType
        }
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
