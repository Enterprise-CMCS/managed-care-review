import { parseErrorToError } from '@mc-review/helpers'
import type { StateUserType } from '../../domain-models'
import { includeUsersWithBaseData } from '../contractAndRates/prismaUserHelpers'
import type { ExtendedPrismaClient } from '../prismaClient'
import { domainUserFromPrismaUser } from './prismaDomainUser'

export type FindStateUserArgsType = {
    email: string
    givenName: string
    familyName: string
}

export async function findStateUser(
    client: ExtendedPrismaClient,
    args: FindStateUserArgsType
): Promise<StateUserType | Error | undefined> {
    const { email, givenName, familyName } = args
    try {
        // email is not unique on the User table, neither is givenName or familyName
        // Use all 3 pieces of information to reduce duplicate records from being found
        // If there are duplicates, prefer the newest account
        const result = await client.user.findFirst({
            where: {
                email: { equals: email, mode: 'insensitive' },
                givenName: { equals: givenName, mode: 'insensitive' },
                familyName: { equals: familyName, mode: 'insensitive' },
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
