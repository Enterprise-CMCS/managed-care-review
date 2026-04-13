import type { UserType } from '../../domain-models'
import { domainUserFromPrismaUser } from './prismaDomainUser'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { UserRoles } from '../../domain-models/UserType'

export type UpdateUserInfoArgsType = {
    email: string
    givenName: string
    familyName: string
    role: UserRoles
    stateCode?: string
}

export async function updateUserInfo(
    client: ExtendedPrismaClient,
    userID: string,
    args: UpdateUserInfoArgsType
): Promise<UserType | Error> {
    try {
        const updateResult = await client.user.update({
            where: {
                id: userID,
            },
            data: {
                email: args.email,
                givenName: args.givenName,
                familyName: args.familyName,
                role: args.role,
                stateCode: args.stateCode ?? null,
            },
            include: {
                stateAssignments: {
                    orderBy: {
                        stateCode: 'asc',
                    },
                },
            },
        })

        return domainUserFromPrismaUser(updateResult)
    } catch (err) {
        return err
    }
}
