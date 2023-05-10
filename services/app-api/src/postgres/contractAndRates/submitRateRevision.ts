import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { RateRevision } from "./rateType";

// Update the given revision
// * invalidate relationships of previous revision
// * set the ActionInfo
async function submitRateRevision(
                                                                client: PrismaClient, 
                                                                revisionID: string,
                                                                submitInfo: UpdateInfoType,
                                                            ): Promise<RateRevision | Error> {

    const groupTime = new Date()

    try {

        // get the latest contractRevisions based on our draft ones
        const currentRev = await client.rateRevisionTable.findUnique({
            where: {
                id: revisionID,
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
            return new Error('cant find the current rev to submit')
        }

        const freshContractRevs = currentRev.draftContracts.map((c) => c.revisions[0])
        console.log('looking at the current set of revs: ', freshContractRevs)

        const updated = await client.rateRevisionTable.update({
            where: {
                id: revisionID,
            },
            data: {
                submitInfo: {
                    create: {
                        id: uuidv4(),
                        updateAt: submitInfo.updatedAt,
                        updateByID: submitInfo.updatedBy,
                        updateReason: submitInfo.updatedReason,
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
            include: {
                contractRevisions: true
            }
        })

        // invalidate all joins on the old revision
        if (oldRev) {
            console.log('OLD REV', oldRev)
            const updatedJoins = await client.rateRevisionsOnContractRevisionsTable.updateMany({
                where: {
                    rateRevisionID: oldRev.id,
                    validUntil: null,
                },
                data: {
                    validUntil: groupTime,
                    invalidatedByRateRevisionID: updated.id,
                }
            })
            console.log('UPDATED OLD REVS', updatedJoins)
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
        console.log("SUBMIT PRISMA CONTRACT ERR", err)
        return err
    }

    return new Error('nope')
}

export {
    submitRateRevision,
}
