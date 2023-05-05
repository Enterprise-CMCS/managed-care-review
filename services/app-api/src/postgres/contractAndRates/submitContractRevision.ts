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
                    updateMany: {
                        where: {
                            contractRevisionID: revisionID, // This seems unnecessary but it compiles
                        },
                        data: {
                            validAfter: groupTime,
                        }
                    }
                }
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    }
                },
                draftFormData: true,
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
            contractFormData: updated.draftFormData.contractDescription || 'NOTHING',
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
