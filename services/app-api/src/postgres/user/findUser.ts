import type { UserType } from '../../domain-models'
import { domainUserFromPrismaUser } from './prismaDomainUser'
import type { ExtendedPrismaClient } from '../prismaClient'

export async function findUser(
    client: ExtendedPrismaClient,
    id: string
): Promise<UserType | Error | undefined> {
    try {
        const findResult = await client.user.findUnique({
            where: {
                id: id,
            },
            include: {
                stateAssignments: {},
            },
        })

        if (!findResult) {
            return undefined
        }

        return domainUserFromPrismaUser(findResult)
    } catch (err) {
        return err
    }
}
