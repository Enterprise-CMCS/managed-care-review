import { PrismaTransactionType } from '../prismaTypes'
import { RateType } from '../../domain-models/contractAndRates'
import { includeFullRate } from './prismaSubmittedRateHelpers'
import { parseRateWithHistory } from './parseRateWithHistory'
import { NotFoundError } from '../storeError'

async function findRateWithHistory(
    client: PrismaTransactionType,
    rateID: string
): Promise<RateType | Error> {
    try {
        const rate = await client.rateTable.findFirst({
            where: {
                id: rateID,
            },
            include: includeFullRate,
        })

        if (!rate) {
            const err = `PRISMA ERROR: Cannot find rate with id: ${rateID}`
            console.error(err)
            return new NotFoundError(err)
        }

        return parseRateWithHistory(rate)
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findRateWithHistory }
