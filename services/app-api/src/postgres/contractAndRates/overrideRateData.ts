import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { findRateWithHistory } from './findRateWithHistory'

type OverrideRateDataArgsType = {
    rateID: string
    updatedByID: string
    description: string
    overrides: {
        initiallySubmittedAt?: Date | null
    }
}

const overrideRateDataInsideTransaction = async (
    tx: PrismaTransactionType,
    args: OverrideRateDataArgsType
): Promise<RateType | Error> => {
    const { rateID, updatedByID, description, overrides } = args

    await tx.rateOverrides.create({
        data: {
            rateID,
            updatedByID,
            description,
            initiallySubmittedAt: overrides.initiallySubmittedAt ?? null,
        },
    })

    return findRateWithHistory(tx, rateID)
}

const overrideRateData = async (
    client: ExtendedPrismaClient,
    args: OverrideRateDataArgsType
): Promise<RateType | Error> => {
    try {
        return await client.$transaction(
            async (tx) => await overrideRateDataInsideTransaction(tx, args)
        )
    } catch (err) {
        console.error('PRISMA ERROR: Error overriding rate data', err)
        return err
    }
}

export {
    overrideRateData,
    overrideRateDataInsideTransaction,
    type OverrideRateDataArgsType,
}
