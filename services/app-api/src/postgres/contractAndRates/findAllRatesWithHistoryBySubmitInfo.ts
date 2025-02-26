import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models/contractAndRates'
import { parseRateWithHistory } from './parseRateWithHistory'
import { includeFullRate } from './prismaFullContractRateHelpers'

type RateOrErrorType = {
    rateID: string
    rate: RateType | Error
}

type RateOrErrorArrayType = RateOrErrorType[]

type FindAllRatesWithHistoryBySubmitType = {
    stateCode?: string
    useZod?: boolean
}

async function findAllRatesWithHistoryBySubmitInfo(
    client: PrismaTransactionType,
    args?: FindAllRatesWithHistoryBySubmitType
): Promise<RateOrErrorArrayType | Error> {
    try {
        performance.mark('beginFindAllRatesWithHistoryBySubmitInfo')
        const rates = await client.rateTable.findMany({
            where: {
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
            },
            include: {
                ...includeFullRate,
                state: true,
            },
        })

        performance.mark('finishFindAllRatesWithHistoryBySubmitInfo')
        performance.measure(
            'findAllRatesWithHistoryBySubmitInfo: beginFindAllRatesWithHistoryBySubmitInfo to finishFindAllRatesWithHistoryBySubmitInfo',
            'beginFindAllRatesWithHistoryBySubmitInfo',
            'finishFindAllRatesWithHistoryBySubmitInfo'
        )

        const parsedRatesOrErrors: RateOrErrorArrayType = rates.map((rate) => ({
            rateID: rate.id,
            rate: parseRateWithHistory(rate, args?.useZod),
        }))

        return parsedRatesOrErrors
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllRatesWithHistoryBySubmitInfo }
export type { RateOrErrorArrayType, FindAllRatesWithHistoryBySubmitType }
