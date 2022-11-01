import { PrismaClient, User, Role } from '@prisma/client'
import { StoreError, convertPrismaErrorToStoreError } from './storeError'

export type InsertUserArgsType = {
    userID: string
    euaID: string
    givenName: string
    familyName: string
    email: string
    role: Role
}

export async function insertUser(
    client: PrismaClient,
    user: InsertUserArgsType
): Promise<User | StoreError> {
    try {
        const val = await client.user.create({
            data: {
                id: user.userID,
                euaID: user.euaID,
                givenName: user.givenName,
                familyName: user.familyName,
                email: user.email,
                role: user.role,
            },
        })
        return val
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
