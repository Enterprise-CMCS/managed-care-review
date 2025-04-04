import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import { NotFoundError } from '../postgresErrors'
import { getRelatedContracts } from './prismaSharedContractRateHelpers'
import { includeRateRelatedContracts } from './prismaSubmittedRateHelpers'
import type { RelatedContractStripped } from '../../gen/gqlClient'

async function findRateRelatedContractsInTransaction(
    tx: PrismaTransactionType,
    rateID: string
): Promise<RelatedContractStripped[]> {
    const rate = await tx.rateTable.findFirst({
        where: {
            id: rateID,
        },
        include: {
            ...includeRateRelatedContracts,
        },
    })

    if (!rate) {
        throw new NotFoundError(`Cannot find rate with id: ${rateID}`)
    }

    return getRelatedContracts(rate)
}

async function findRateRelatedContracts(
    client: ExtendedPrismaClient,
    rateID: string
): Promise<RelatedContractStripped[] | Error> {
    try {
        return await client.$transaction(
            async (tx) =>
                await findRateRelatedContractsInTransaction(tx, rateID)
        )
    } catch (err) {
        console.error(
            'PRISMA ERROR: Error finding all contracts related to rate',
            err
        )
        return err
    }
}

export { findRateRelatedContracts, findRateRelatedContractsInTransaction }
