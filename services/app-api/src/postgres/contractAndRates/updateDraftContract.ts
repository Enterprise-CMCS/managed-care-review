import { PrismaClient } from '@prisma/client'
import { Contract } from './contractType'
import { findContractWithHistory } from './findContractWithHistory'
import { ContractFormData } from '../prismaTypes'

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftContract(
    client: PrismaClient,
    contractID: string,
    formData: ContractFormData,
    rateIDs: string[]
): Promise<Contract | Error> {
    try {
        // Given all the Rates associated with this draft, find the most recent submitted
        // rateRevision to update.
        const currentRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfoID: null,
            },
        })
        if (!currentRev) {
            console.error('No Draft Rev!')
            return new Error('cant find a draft rev to submit')
        }

        await client.contractRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                submissionType: formData.submissionType,
                submissionDescription: formData.submissionDescription,
                draftRates: {
                    set: rateIDs.map((rID) => ({
                        id: rID,
                    })),
                },
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    },
                },
            },
        })

        return findContractWithHistory(client, contractID)
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return err
    }
}

export { updateDraftContract }
