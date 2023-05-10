import { PrismaClient } from "@prisma/client";
import { Rate } from "./rateType";

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateRateDraft(
                                                client: PrismaClient, 
                                                rateID: string,
                                                formData: string,
                                                contractIDs: string[],
                                            ): Promise<Rate | Error> {

    const groupTime = new Date()
    console.log('Console Grouptime', groupTime)

    try {
        // Given all the Rates associated with this draft, find the most recent submitted 
        // rateRevision to attach to this contract on submit.
        const currentRev = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
                submitInfoID: null,
            },
        })
        if (!currentRev) {
            console.log('No Draft Rev!')
            return new Error('cant find a draft rev to submit')
        }

        const updated = await client.rateRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                name: formData,
                draftContracts: {
                    set: contractIDs.map( (rID) => ({
                        id: rID,
                    }))
                }
            },
            include: {
                contractRevisions: {
                    include: {
                        contractRevision: true,
                    }
                },
            }
        })

        return {
            id: rateID,
            revisions: [{
                id: updated.id,
                revisionFormData: updated.rateCertURL || 'NOTHING',
                contractRevisions: updated.contractRevisions.map( (cr) => ({
                    id: cr.rateRevisionID,
                    contractFormData: cr.contractRevision.name,
                    rateRevisions: [],
                }))
            }]
        }

    }
    catch (err) {
        console.log("SUBMIT PRISMA CONTRACT ERR", err)
    }

    return new Error('nope')
}

export {
    updateRateDraft,
}
