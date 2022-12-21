import { PrismaClient, Role } from '@prisma/client'
import { StoreError, convertPrismaErrorToStoreError } from './storeError'
import { UserType } from '../domain-models'

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
        return val
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
