import type { PrismaTransactionType } from '../prismaTypes'
import type { StrippedRateType } from '../../domain-models/contractAndRates'
import { parseStrippedRateWithHistory } from './parseRateWithHistory'
import { includeStrippedRate } from './prismaFullContractRateHelpers'
import type { ExtendedPrismaClient } from '../prismaClient'
import { parseErrorToError } from '@mc-review/helpers'

type StrippedRateOrErrorType = {
    rateID: string
    rate: StrippedRateType | Error
}

type StrippedRateOrErrorArrayType = StrippedRateOrErrorType[]

type FindAllRatesStrippedType = {
    stateCode?: string
    rateIDs?: string[]
    updatedSince?: Date
}

async function findAllRatesStrippedInTransaction(
    tx: PrismaTransactionType,
    args?: FindAllRatesStrippedType
): Promise<StrippedRateOrErrorArrayType | Error> {
    const stateCode = args?.stateCode
    const rateIDs = args?.rateIDs
    const updatedSince = args?.updatedSince
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
            OR: updatedSince
                ? [
                      { updatedAt: { gte: updatedSince } },
                      {
                          revisions: {
                              some: {
                                  submitInfoID: { not: null },
                                  updatedAt: { gte: updatedSince },
                              },
                          },
                      },
                      {
                          revisions: {
                              some: {
                                  submitInfoID: { not: null },
                                  submitInfo: {
                                      updatedAt: { gte: updatedSince },
                                  },
                              },
                          },
                      },
                  ]
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
        return parseErrorToError(err)
    }
}

export { findAllRatesStripped }
export type { StrippedRateOrErrorArrayType, FindAllRatesStrippedType }
