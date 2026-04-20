import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models/contractAndRates'
import { parseRateWithHistory } from './parseRateWithHistory'
import { includeFullRate } from './prismaFullContractRateHelpers'
import { parseErrorToError } from '@mc-review/helpers'

type RateOrErrorType = {
    rateID: string
    rate: RateType | Error
}

type RateOrErrorArrayType = RateOrErrorType[]

type FindAllRatesWithHistoryBySubmitType = {
    stateCode?: string
    rateIDs?: string[]
    updatedSince?: Date
    useZod?: boolean
}

async function findAllRatesWithHistoryBySubmitInfo(
    client: PrismaTransactionType,
    args?: FindAllRatesWithHistoryBySubmitType
): Promise<RateOrErrorArrayType | Error> {
    try {
        const rates = await client.rateTable.findMany({
            where: {
                id: args?.rateIDs ? { in: args.rateIDs } : undefined,
                revisions: {
                    some: {
                        submitInfoID: {
                            not: null,
                        },
                    },
                },
                stateCode: args?.stateCode
                    ? {
                          equals: args.stateCode,
                      }
                    : {
                          not: 'AS', // exclude test state as per ADR 019
                      },
                AND: args?.updatedSince
                    ? [
                          {
                              OR: [
                                  { updatedAt: { gte: args.updatedSince } },
                                  {
                                      revisions: {
                                          some: {
                                              submitInfoID: { not: null },
                                              updatedAt: {
                                                  gte: args.updatedSince,
                                              },
                                          },
                                      },
                                  },
                                  {
                                      revisions: {
                                          some: {
                                              submitInfoID: { not: null },
                                              submitInfo: {
                                                  updatedAt: {
                                                      gte: args.updatedSince,
                                                  },
                                              },
                                          },
                                      },
                                  },
                              ],
                          },
                      ]
                    : undefined,
            },
            include: {
                ...includeFullRate,
                state: true,
            },
        })

        const parsedRatesOrErrors: RateOrErrorArrayType = rates.map((rate) => ({
            rateID: rate.id,
            rate: parseRateWithHistory(rate, args?.useZod),
        }))

        return parsedRatesOrErrors
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return parseErrorToError(err)
    }
}

export { findAllRatesWithHistoryBySubmitInfo }
export type { RateOrErrorArrayType, FindAllRatesWithHistoryBySubmitType }
