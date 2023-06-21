import { PrismaClient } from '@prisma/client'
import { findRate } from './findRate'
import { Rate } from './rateType'

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateRateDraft(
    client: PrismaClient,
    rateID: string,
    formData: string,
    contractIDs: string[]
): Promise<Rate | Error> {
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
                name: formData,
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

        return findRate(client, rateID)
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return err
    }
}

export { updateRateDraft }
