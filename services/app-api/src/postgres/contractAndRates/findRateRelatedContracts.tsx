import type {PrismaTransactionType} from '../prismaTypes';
import type { StrippedRelatedContract } from '../../domain-models';
import type {ExtendedPrismaClient} from '../prismaClient';
import {NotFoundError} from '../postgresErrors';
import { getRelatedContracts } from './prismaSharedContractRateHelpers';
import { includeRateRelatedContracts } from './prismaSubmittedRateHelpers';

async function findRateRelatedContractsInTransaction(
    tx: PrismaTransactionType,
    rateID: string
): Promise<StrippedRelatedContract[]> {
    const rate = await tx.rateTable.findFirst({
        where: {
            id: rateID
        },
        include: {
            ...includeRateRelatedContracts
        }
    })

    if (!rate) {
        throw new NotFoundError(`Cannot find rate with id: ${rateID}`)
    }

    return getRelatedContracts(rate)
}

async function findRateRelatedContracts(
    client: ExtendedPrismaClient,
    rateID: string
): Promise<StrippedRelatedContract[] | Error> {
    try {
        return await client.$transaction(
            async (tx) => await findRateRelatedContractsInTransaction(tx, rateID)
        )
    } catch (err) {
        console.error(
            'PRISMA ERROR: Error finding all contracts related to rate',
            err
        )
        return err
    }
}

export {
    findRateRelatedContracts,
    findRateRelatedContractsInTransaction
}
