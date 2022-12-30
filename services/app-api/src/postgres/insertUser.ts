import { PrismaClient, Role } from '@prisma/client'
import { StoreError, convertPrismaErrorToStoreError } from './storeError'
import {
    AdminUserType,
    CMSUserType,
    StateUserType,
    UserType,
} from '../domain-models'

export type InsertUserArgsType = {
    userID: string
    givenName: string
    familyName: string
    email: string
    role: Role
    stateCode?: string
}

export async function insertUser(
    client: PrismaClient,
    user: InsertUserArgsType
): Promise<UserType | StoreError> {
    try {
        console.log('Trying to insert the user to postgres....')
        const val = await client.user.create({
            data: {
                id: user.userID,
                givenName: user.givenName,
                familyName: user.familyName,
                email: user.email,
                role: user.role,
                stateCode: user.stateCode ?? null,
            },
        })

        switch (val.role) {
            case 'ADMIN_USER':
                return val as AdminUserType
            case 'CMS_USER':
                return val as CMSUserType
            case 'STATE_USER':
                return val as StateUserType
        }
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
