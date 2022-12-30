import { PrismaClient } from '@prisma/client'
import { convertPrismaErrorToStoreError, StoreError } from './storeError'
import {
    CMSUserType,
    StateUserType,
    UserType,
    AdminUserType,
} from '../domain-models'

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
        switch (findResult?.role) {
            case 'CMS_USER':
                return findResult as CMSUserType
            case 'STATE_USER':
                return findResult as StateUserType
            case 'ADMIN_USER':
                return findResult as AdminUserType
            default:
                return {} as StateUserType
        }
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
