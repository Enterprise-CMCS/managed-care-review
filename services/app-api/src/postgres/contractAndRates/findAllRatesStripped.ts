import type { PrismaTransactionType } from '../prismaTypes'
import type { StrippedRateType } from '../../domain-models/contractAndRates'
import { parseStrippedRateWithHistory } from './parseRateWithHistory'
import { includeStrippedRate } from './prismaFullContractRateHelpers'
import type { ExtendedPrismaClient } from '../prismaClient'

type StrippedRateOrErrorType = {
    rateID: string
    rate: StrippedRateType | Error
}

type StrippedRateOrErrorArrayType = StrippedRateOrErrorType[]

type FindAllRatesStrippedType = {
    stateCode?: string
    rateIDs?: string[]
}

async function findAllRatesStrippedInTransaction(
    tx: PrismaTransactionType,
    args?: FindAllRatesStrippedType
): Promise<StrippedRateOrErrorArrayType | Error> {
    const stateCode = args?.stateCode
    const rateIDs = args?.rateIDs
    const rates = await tx.rateTable.findMany({
        where: {
            revisions: {
                some: {
                    submitInfoID: {
                        not: null,
                    },
                },
            },
            stateCode: stateCode
                ? {
                      equals: stateCode,
                  }
                : {
                      not: 'AS', // exclude test state as per ADR 019
                  },
            id: rateIDs
                ? {
                      in: rateIDs,
                  }
                : undefined,
        },
        include: includeStrippedRate,
    })

    const parsedRatesOrErrors: StrippedRateOrErrorArrayType = rates.map(
        (rate) => ({
            rateID: rate.id,
            rate: parseStrippedRateWithHistory(rate),
        })
    )

    return parsedRatesOrErrors
}

async function findAllRatesStripped(
    client: ExtendedPrismaClient,
    args?: FindAllRatesStrippedType
): Promise<StrippedRateOrErrorArrayType | Error> {
    try {
        return await client.$transaction(
            async (tx) => await findAllRatesStrippedInTransaction(tx, args)
        )
    } catch (err) {
        console.error(
            'PRISMA ERROR: Error finding all rates for dashboard',
            err
        )
        return err
    }
}

export { findAllRatesStripped }
export type { StrippedRateOrErrorArrayType, FindAllRatesStrippedType }
