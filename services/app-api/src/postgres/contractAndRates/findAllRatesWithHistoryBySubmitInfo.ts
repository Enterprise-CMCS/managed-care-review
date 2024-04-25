import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models/contractAndRates'
import { parseRateWithHistory } from './parseRateWithHistory'
import { includeFullRate } from './prismaSubmittedRateHelpers'

type RateOrErrorType = {
    rateID: string
    rate: RateType | Error
}

type RateOrErrorArrayType = RateOrErrorType[]

async function findAllRatesWithHistoryBySubmitInfo(
    client: PrismaTransactionType,
    stateCode?: string
): Promise<RateOrErrorArrayType | Error> {
    try {
        const rates = await client.rateTable.findMany({
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
            include: {
                ...includeFullRate,
                state: true,
            },
        })

        const parsedRatesOrErrors: RateOrErrorArrayType = rates.map((rate) => ({
            rateID: rate.id,
            rate: parseRateWithHistory(rate),
        }))

        return parsedRatesOrErrors
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllRatesWithHistoryBySubmitInfo }
export type { RateOrErrorArrayType }
