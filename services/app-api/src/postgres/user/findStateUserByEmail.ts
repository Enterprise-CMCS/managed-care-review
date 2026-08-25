import { parseErrorToError } from '@mc-review/helpers'
import type { StateUserType } from '../../domain-models'
import { includeUsersWithBaseData } from '../contractAndRates/prismaUserHelpers'
import type { ExtendedPrismaClient } from '../prismaClient'
import { domainUserFromPrismaUser } from './prismaDomainUser'

export async function findStateUserByEmail(
    client: ExtendedPrismaClient,
    email: string
): Promise<StateUserType | Error | undefined> {
    try {
        // email is not unique on the User table
        // If there are duplicates, prefer the newest account
        const result = await client.user.findFirst({
            where: {
                email: email,
                role: 'STATE_USER',
            },
            include: includeUsersWithBaseData,
            orderBy: {
                createdAt: 'desc',
            },
        })

        if (!result) {
            return undefined
        }

        let domainUserResult = domainUserFromPrismaUser(result)

        if (domainUserResult instanceof Error) {
            return domainUserResult
        }

        // The where condition guarantees this
        return domainUserResult as StateUserType
    } catch (err) {
        return parseErrorToError(err)
    }
}
