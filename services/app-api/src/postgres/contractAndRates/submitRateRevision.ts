import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { RateRevision } from "./findContract";

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

        const updated = await client.rateRevisionTable.update({
            where: {
                id: revisionID,
            },
            data: {
                submitInfo: {
                    create: {
                        id: uuidv4(),
                        updateAt: submitInfo.updatedAt,
                        updateBy: submitInfo.updatedBy,
                        updateReason: submitInfo.updatedReason,
                    }
                },
                contractRevisions: {
                    updateMany: {
                        where: {
                            rateRevisionID: revisionID, // This seems unnecessary but it compiles
                        },
                        data: {
                            validAfter: groupTime,
                        }
                    }
                }
            },
            include: {
                contractRevisions: {
                    include: {
                        contractRevision: {
                            include: {
                                draftFormData: true
                            }
                        }
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
                contractFormData: cRev.contractRevision.draftFormData.contractDescription || 'NOPEs',
                rateRevisions: [],
            }))
        }
    }
    catch (err) {
        console.log("SUBMIT PRISMA CONTRACT ERR", err)
    }

    return new Error('nope')
}

export {
    submitRateRevision,
}
