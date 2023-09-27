import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../storeError'
import { parseRateWithHistory } from './parseRateWithHistory'
import { includeFullRate } from './prismaSubmittedRateHelpers'

type RateOrErrorType = {
    rateID: string
    rate: RateType | Error
}

type RateOrErrorArrayType = RateOrErrorType[]

async function findAllRatesWithHistoryBySubmitInfo(
    client: PrismaTransactionType,
): Promise<RateOrErrorArrayType | NotFoundError | Error> {
    try {
        const rates = await client.rateTable.findMany({
            include: includeFullRate,
        })

        if (!rates) {
            const err = `PRISMA ERROR: Cannot find rates with state code: ${stateCode}`
            console.error(err)
            return new NotFoundError(err)
        }

        const parsedRatesOrErrors: RateOrErrorArrayType = rates.map(
            (rate) => ({
                rateID: rate.id,
                rate: parseRateWithHistory(rate),
            })
        )

        return parsedRatesOrErrors
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findAllRatesWithHistoryBySubmitInfo}
export type { RateOrErrorArrayType }
