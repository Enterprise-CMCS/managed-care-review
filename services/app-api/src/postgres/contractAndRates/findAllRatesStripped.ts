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

async function findAllRatesStrippedInTransaction(
    tx: PrismaTransactionType,
    stateCode?: string
): Promise<StrippedRateOrErrorArrayType | Error> {
    try {
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
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

async function findAllRatesStripped(
    client: ExtendedPrismaClient,
    stateCode?: string
): Promise<StrippedRateOrErrorArrayType | Error> {
    try {
        return await client.$transaction(
            async (tx) => await findAllRatesStrippedInTransaction(tx, stateCode)
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
export type { StrippedRateOrErrorArrayType }
