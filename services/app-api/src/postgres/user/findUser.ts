import { PrismaClient } from '@prisma/client'
import { convertPrismaErrorToStoreError, StoreError } from '../storeError'
import {
    AdminUserType,
    CMSUserType,
    StateUserType,
    UserType,
} from '../../domain-models'

export async function findUser(
    client: PrismaClient,
    id: string
): Promise<UserType | StoreError> {
    try {
        const findResult = await client.user.findUnique({
            where: {
                id: id,
            },
            include: {
                stateAssignments: {},
            },
        })

        switch (findResult?.role) {
            case 'ADMIN_USER':
                return findResult as AdminUserType
            case 'CMS_USER':
                return findResult as CMSUserType
            case 'STATE_USER':
                return findResult as StateUserType
            default:
                return {} as UserType
        }
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
