import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { Contract } from "./contractType";
import { findContract } from "./findContract";

// Unlock the given contract
// * copy form data
// * set relationships based on last submission
async function unlockContract(
                                                client: PrismaClient, 
                                                contractID: string,
                                                unlockedByUserID: string, 
                                                unlockReason: string,
                                            ): Promise<Contract | Error> {

    const groupTime = new Date()

    try {

        // Given all the Rates associated with this draft, find the most recent submitted 
        // rateRevision to attach to this contract on submit.
        const currentRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                rateRevisions: {
                    where: {
                        validUntil: null,
                    },
                    include: {
                        rateRevision: true,
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

        const previouslySubmittedRateIDs = currentRev.rateRevisions.map((c) => c.rateRevision.rateID)
        console.log('looking at the current set of raterevs: ', currentRev.rateRevisions)


        const updated = await client.contractRevisionTable.create({
            data: {
                id: uuidv4(),
                contract: {
                    connect: {
                        id: contractID,
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
                draftRates: {
                    connect: previouslySubmittedRateIDs.map( (cID) => ({
                        id: cID,
                    }))
                },
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    }
                },
            }
        })

        return findContract(client, contractID)

    }
    catch (err) {
        console.log("SUBMIT PRISMA CONTRACT ERR", err)
    }

    return new Error('nope')
}

export {
    unlockContract,
}
