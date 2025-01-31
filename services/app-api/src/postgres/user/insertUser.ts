import type { DivisionType, UserType } from '../../domain-models'
import { toDomainUser } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'

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
    client: ExtendedPrismaClient,
    user: InsertUserArgsType
): Promise<UserType | Error> {
    try {
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
        return toDomainUser(val)
    } catch (err) {
        return err
    }
}
