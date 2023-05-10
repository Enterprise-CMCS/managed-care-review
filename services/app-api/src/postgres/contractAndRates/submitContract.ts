import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { Contract, findContract } from "./findContract";

// Update the given revision
// * invalidate relationships of previous revision
// * set the ActionInfo
async function submitContract(
                                                client: PrismaClient, 
                                                contractID: string,
                                                submittedByUserID: string, 
                                                submitReason: string,
                                            ): Promise<Contract | Error> {

    const groupTime = new Date()
    console.log('Console Grouptime', groupTime)

    try {

        // Given all the Rates associated with this draft, find the most recent submitted 
        // rateRevision to attach to this contract on submit.
        const currentRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfoID: null,
            },
            include: {
                draftRates: {
                    include: {
                        revisions: {
                            where: {
                                submitInfoID: { not: null },
                            },
                            take: 1,
                            orderBy: {
                                createdAt: 'desc',
                            }
                        },
                    }
                }
            }
        })
        console.log("FOUND FIRST", currentRev)
        if (!currentRev) {
            console.log('No Unsubmitted Rev!')
            return new Error('cant find the current rev to submit')
        }

        const submittedRateRevisions = currentRev.draftRates.map((c) => c.revisions[0])
        console.log('looking at the current set of revs: ', submittedRateRevisions)

        const updated = await client.contractRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                submitInfo: {
                    create: {
                        id: uuidv4(),
                        updateAt: groupTime,
                        updateByID: submittedByUserID,
                        updateReason: submitReason,
                    }
                },
                rateRevisions: {
                    createMany: {
                        data: submittedRateRevisions.map((rev) => ({
                            rateRevisionID: rev.id,
                            validAfter: groupTime,
                        }))
                    }
                }
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    }
                },
            }
        })

        const oldRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: updated.contractID,
                NOT: {
                    id: updated.id,
                }
            }
        })

        // invalidate all joins on the old revision // maybe should just invalidate ALL where?
        if (oldRev) {
            await client.rateRevisionsOnContractRevisionsTable.updateMany({
                where: {
                    contractRevisionID: oldRev.id,
                    validUntil: null,
                },
                data: {
                    validUntil: groupTime,
                    invalidatedByContractRevisionID: updated.id,
                }
            })
        }

        return findContract(client, contractID)

    }
    catch (err) {
        console.log("SUBMITeeee PRISMA CONTRACT ERR", err)
    }

    return new Error('nope')
}

export {
    submitContract,
}
