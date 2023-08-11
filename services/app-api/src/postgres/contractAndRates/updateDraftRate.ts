import type { PrismaClient } from '@prisma/client'
import type { RateType } from '../../domain-models/contractAndRates'
import { findRateWithHistory } from './findRateWithHistory'

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftRate(
    client: PrismaClient,
    rateID: string,
    formData: string,
    contractIDs: string[]
): Promise<RateType | Error> {
    try {
        // Given all the Rates associated with this draft, find the most recent submitted
        // rateRevision to update.
        const currentRev = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
                submitInfoID: null,
            },
        })
        if (!currentRev) {
            console.error('No Draft Rev!')
            return new Error('cant find a draft rev to submit')
        }

        await client.rateRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                rateCertificationName: formData,
                draftContracts: {
                    set: contractIDs.map((rID) => ({
                        id: rID,
                    })),
                },
            },
            include: {
                contractRevisions: {
                    include: {
                        contractRevision: true,
                    },
                },
            },
        })

        return findRateWithHistory(client, rateID)
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return err
    }
}

export { updateDraftRate }
