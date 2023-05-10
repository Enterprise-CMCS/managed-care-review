import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { RateRevision } from "./rateType";

async function createRateRevision(
                                                                client: PrismaClient, 
                                                                rateID: string,
                                                                rateURL: string,
                                                                draftContractIDs: string[],
                                                                unlockInfo?: UpdateInfoType,
                                                            ): Promise<RateRevision | Error> {

    try {
 
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
                        updateByID: unlockInfo.updatedBy,
                        updateReason: unlockInfo.updatedReason,
                    }
                } : undefined,
                name: '1.0', 
                rateCertURL: rateURL,
                draftContracts: {
                    connect: draftContractIDs.map( (cID) => ({
                        id: cID,
                    }))
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

        return {
            id: rateRev.id,
            revisionFormData: rateRev.rateCertURL || 'NOTHINGS',
            contractRevisions: rateRev.contractRevisions.map ( (cRev) => ({
                id: cRev.contractRevisionID,
                contractFormData: cRev.contractRevision.name,
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
