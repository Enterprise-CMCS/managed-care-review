import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError } from '../postgresErrors'
import type { RateRevisionTable } from '@prisma/client'

async function findRateRevision(
    client: PrismaTransactionType,
    rateRevisionID: string
): Promise<RateRevisionTable | Error> {
    try {
        const rateRevision = await client.rateRevisionTable.findUnique({
            where: {
                id: rateRevisionID,
            },
        })

        if (!rateRevision) {
            const err = `PRISMA ERROR: Cannot find rate revision with id: ${rateRevisionID}`
            return new NotFoundError(err)
        }

        return rateRevision
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findRateRevision }
