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
                states: {},
            },
        })

        switch (findResult?.role) {
            case 'ADMIN_USER':
                return findResult as AdminUserType
            case 'CMS_USER':
                return {
                    id: findResult.id,
                    role: 'CMS_USER',
                    email: findResult.email,
                    givenName: findResult.givenName,
                    familyName: findResult.familyName,
                    stateAssignments: findResult.states,
                } as CMSUserType
            case 'STATE_USER':
                return findResult as StateUserType
            default:
                return {} as UserType
        }
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
