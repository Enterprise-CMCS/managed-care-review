import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { ContractRevision } from "./findContract";

// Update the given revision
// * invalidate relationships of previous revision
// * set the ActionInfo
async function submitContractRevision(
                                                                client: PrismaClient, 
                                                                revisionID: string,
                                                                submitInfo: UpdateInfoType,
                                                            ): Promise<ContractRevision | Error> {

    const groupTime = new Date()
    console.log('Console Grouptime', groupTime)

    try {

        // get the latest rateRevisions based on our draft ones
        const currentRev = await client.contractRevisionTable.findUnique({
            where: {
                id: revisionID,
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
        if (!currentRev) {
            return new Error('cant find the current rev to submit')
        }

        const freshRateRevs = currentRev.draftRates.map((c) => c.revisions[0])
        console.log('looking at the current set of revs: ', freshRateRevs)

        const updated = await client.contractRevisionTable.update({
            where: {
                id: revisionID,
            },
            data: {
                submitInfo: {
                    create: {
                        id: uuidv4(),
                        updateAt: groupTime,
                        updateBy: submitInfo.updatedBy,
                        updateReason: submitInfo.updatedReason,
                    }
                },
                rateRevisions: {
                    createMany: {
                        data: freshRateRevs.map((rev) => ({
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

        // invalidate all joins on the old revision
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

        return {
            id: updated.id,
            contractFormData: updated.name,
            rateRevisions: updated.rateRevisions.map( (rr) => ({
                id: rr.rateRevisionID,
                revisionFormData: rr.rateRevision.rateCertURL || 'NO URL',
            }))
        }
    }
    catch (err) {
        console.log("SUBMIT PRISMA CONTRACT ERR", err)
    }

    return new Error('nope')
}

export {
    submitContractRevision,
}
