import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { Rate } from "./rateType";
import { findContract } from "./findContract";

// Unlock the given rate
// * copy form data
// * set relationships based on last submission
async function unlockRate(
                                                client: PrismaClient, 
                                                rateID: string,
                                                unlockedByUserID: string, 
                                                unlockReason: string,
                                            ): Promise<Rate | Error> {

    const groupTime = new Date()

    try {

        // Given all the Rates associated with this draft, find the most recent submitted 
        // rateRevision to attach to this contract on submit.
        const currentRev = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                contractRevisions: {
                    where: {
                        validUntil: null,
                    },
                    include: {
                        contractRevision: true,
                    }
                }
            }
        })
        if (!currentRev) {
            console.log('No Rev! Contracts should always have revisions.')
            return new Error('cant find the current rev to submit')
        }

        if (!currentRev.submitInfoID) {
            console.log('this contract already has an unsubmitted revision')
            return new Error('cant unlock an alreday unlocked submission')
        }

        const previouslySubmittedContractIDs = currentRev.contractRevisions.map((c) => c.contractRevision.contractID)

        const updated = await client.rateRevisionTable.create({
            data: {
                id: uuidv4(),
                rate: {
                    connect: {
                        id: rateID,
                    }
                },
                name: currentRev.name,
                unlockInfo: {
                    create: {
                        id: uuidv4(),
                        updateAt: groupTime,
                        updateByID: unlockedByUserID,
                        updateReason: unlockReason,
                    }
                },
                draftContracts: {
                    connect: previouslySubmittedContractIDs.map( (cID) => ({
                        id: cID,
                    }))
                },
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
    unlockRate,
}
