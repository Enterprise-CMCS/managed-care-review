import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { ContractRevision } from "./findContract";

async function insertDraftContractRevision(
                                                                client: PrismaClient, 
                                                                contractID: string,
                                                                formData: string,
                                                                draftRateRevisionIDs: string[],
                                                                unlockInfo?: UpdateInfoType 
                                                            ): Promise<ContractRevision | Error> {

    try {

        const contractRev = await client.contractRevisionTable.create({ 
            data: { 
                id: uuidv4(), 
                contract: {
                    connect: {
                        id: contractID,
                    }
                }, 
                name: formData,
                unlockInfo: unlockInfo ? {
                    create: {
                        id: uuidv4(),
                        updateAt: unlockInfo.updatedAt,
                        updateByID: unlockInfo.updatedBy,
                        updateReason: unlockInfo.updatedReason,
                    }
                } : undefined,
                draftRates: {
                    connect: draftRateRevisionIDs.map( (cID) => ({
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

        console.log('created', contractRev)

        return {
            id: contractRev.id,
            contractFormData: contractRev.name,
            rateRevisions: contractRev.rateRevisions.map( (rr) => ({
                id: rr.rateRevisionID,
                revisionFormData: rr.rateRevision.rateCertURL || 'NO URL',
            }))
        }

    } catch (err) {
        console.log("CONTRACT PRISMA ERR", err)
    }

    return new Error('nope')
}

export {
    insertDraftContractRevision as createContractRevision,
}
