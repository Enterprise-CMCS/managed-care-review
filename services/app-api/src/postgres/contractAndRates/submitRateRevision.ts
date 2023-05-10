import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { RateRevision } from "./rateType";

// Update the given revision
// * invalidate relationships of previous revision
// * set the ActionInfo
async function submitRateRevision(
                                                    client: PrismaClient, 
                                                    rateID: string,
                                                    submittedByUserID: string, 
                                                    submitReason: string,
                                                ): Promise<RateRevision | Error> {

    const groupTime = new Date()

    try {

        // Given all the Contracts associated with this draft, find the most recent submitted 
        // contractRevision to attach to this rate on submit.
        const currentRev = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
                submitInfoID: null,
            },
            include: {
                draftContracts: {
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
        if (!currentRev) {
            console.error('No Unsubmitted Rate Rev!')
            return new Error('cant find the current rev to submit')
        }

        const freshContractRevs = currentRev.draftContracts.map((c) => c.revisions[0])

        const updated = await client.rateRevisionTable.update({
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
                contractRevisions: {
                    createMany: {
                        data: freshContractRevs.map((rev) => ({
                            contractRevisionID: rev.id,
                            validAfter: groupTime,
                        }))
                    }
                }
            },
            include: {
                contractRevisions: {
                    include: {
                        contractRevision: true,
                    }
                }
            }
        })

        const oldRev = await client.rateRevisionTable.findFirst({
            where: {
                rateID: updated.rateID,
                NOT: {
                    id: updated.id,
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                contractRevisions: true
            }
        })

        // invalidate all joins on the old revision
        if (oldRev) {
            await client.rateRevisionsOnContractRevisionsTable.updateMany({
                where: {
                    rateRevisionID: oldRev.id,
                    validUntil: null,
                },
                data: {
                    validUntil: groupTime,
                    invalidatedByRateRevisionID: updated.id,
                }
            })
        }

        return {
            id: updated.id,
            revisionFormData: updated.rateCertURL || 'NOTHINGS',
            contractRevisions: updated.contractRevisions.map ( (cRev) => ({
                id: cRev.contractRevisionID,
                contractFormData: cRev.contractRevision.name,
                rateRevisions: [],
            }))
        }
    }
    catch (err) {
        console.error("SUBMIT PRISMA CONTRACT ERR", err)
        return err
    }
}

export {
    submitRateRevision,
}
