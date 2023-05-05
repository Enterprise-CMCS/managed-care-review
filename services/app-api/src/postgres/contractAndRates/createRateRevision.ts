import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { DraftValidAfterDate } from "./dbConstants";
import { RateRevision } from "./findContract";

async function createRateRevision(
                                                                client: PrismaClient, 
                                                                rateID: string,
                                                                rateURL: string,
                                                                contractRevisionIDs: string[],
                                                                unlockInfo?: UpdateInfoType,
                                                            ): Promise<RateRevision | Error> {

    try {
        // const groupTime = new Date()

        // const oldRev = await client.rateRevisionTable.findFirst({
        //     where: {
        //         rateID: rateID
        //     }
        // })

        // // invalidate all joins on the old revision
        // if (oldRev) {
        //     await client.rateRevisionsOnContractRevisionsTable.updateMany({
        //         where: {
        //             rateRevisionID: oldRev.id,
        //         },
        //         data: {
        //             validUntil: groupTime,
        //         }
        //     })
        // }

        const rateRev = await client.rateRevisionTable.create({
            data: {
                id: uuidv4(), 
                rate: {
                    connect: {
                        id: rateID,
                    }
                }, 
                unlockInfo: unlockInfo ? {
                    create: {
                        id: uuidv4(),
                        updateAt: unlockInfo.updatedAt,
                        updateBy: unlockInfo.updatedBy,
                        updateReason: unlockInfo.updatedReason,
                    }
                } : undefined,
                name: '1.0', 
                rateCertURL: rateURL,
                contractRevisions: {
                    createMany: {
                        data: contractRevisionIDs.map( (cID) => ({
                            contractRevisionID: cID,
                            validAfter: DraftValidAfterDate,
                        }))
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

        return {
            id: rateRev.id,
            revisionFormData: rateRev.rateCertURL || 'NOTHINGS',
            contractRevisions: rateRev.contractRevisions.map ( (cRev) => ({
                id: cRev.contractRevisionID,
                contractFormData: cRev.contractRevision.draftFormData.contractDescription || 'NOPEs',
                rateRevisions: [],
            }))
        }

    } catch (err) {
        console.log('PRISMA ERR', err)
    }

    return new Error('Boo')

}


export {
    createRateRevision,
}
