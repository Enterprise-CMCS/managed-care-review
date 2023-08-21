import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../storeError'
import { includeFullRate } from './prismaSubmittedRateHelpers'
import { parseRateWithHistory } from './parseRateWithHistory'

// findRateWithHistory returns a RateType with a full set of
// RateRevisions in reverse chronological order. Each revision is a change to this
// Rate with submit and unlock info. Changes to the data of this rate, or changes
// to the data or relations of associate revisions will all surface as new RateRevision
async function findRateWithHistory(
    client: PrismaTransactionType,
    rateID: string
): Promise<RateType | NotFoundError | Error> {
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
