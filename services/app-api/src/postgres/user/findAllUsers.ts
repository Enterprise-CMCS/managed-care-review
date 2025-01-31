
import type { UserType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { parseDomainUsersFromPrismaUsers } from './prismaDomainUser'

export async function findAllUsers(
    client: ExtendedPrismaClient,
): Promise<UserType[] | Error> {
    try {
        const allUsers = await client.user.findMany({
            include: {
                stateAssignments: true,
            },
            orderBy: {
                familyName: 'asc',
            },
        })

        const domainUserResults = parseDomainUsersFromPrismaUsers(allUsers)

        if (domainUserResults instanceof Error) {
            return domainUserResults
        }

        return domainUserResults
    } catch (err) {
        console.error(err)
        return err
    }
}
