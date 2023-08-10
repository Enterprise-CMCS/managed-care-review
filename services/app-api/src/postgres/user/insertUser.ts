import type { PrismaClient, Role } from '@prisma/client'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError } from '../storeError'
import type { DivisionType, UserType } from '../../domain-models'
import { toDomainUser } from '../../domain-models'

export type InsertUserArgsType = {
    userID: string
    givenName: string
    familyName: string
    email: string
    role: Role
    stateCode?: string
    divisionAssignment?: DivisionType
}

export async function insertUser(
    client: PrismaClient,
    user: InsertUserArgsType
): Promise<UserType | StoreError> {
    try {
        console.info('Trying to insert the user to postgres....')
        const val = await client.user.create({
            data: {
                id: user.userID,
                givenName: user.givenName,
                familyName: user.familyName,
                email: user.email,
                role: user.role,
                stateCode: user.stateCode ?? null,
                divisionAssignment: user.divisionAssignment ?? null,
            },
        })
        console.info('insert user return: ' + val)
        return toDomainUser(val)
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
