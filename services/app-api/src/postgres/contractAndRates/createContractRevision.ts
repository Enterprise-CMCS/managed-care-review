import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { DraftValidAfterDate } from "./dbConstants";
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
                name: 'A.0',
                unlockInfo: unlockInfo ? {
                    create: {
                        id: uuidv4(),
                        updateAt: unlockInfo.updatedAt,
                        updateBy: unlockInfo.updatedBy,
                        updateReason: unlockInfo.updatedReason,
                    }
                } : undefined,
                draftRates: {
                    connect: draftRateRevisionIDs.map( (cID) => ({
                        id: cID,
                    }))
                },
                draftFormData: {
                    create: {
                        id: uuidv4(),
                        startDate: new Date(),
                        endDate: new Date(),
                        contractDescription: formData,
                        submissionType: 'CONTRACT_ONLY',
                        federalAuthorities: ['WAIVER_1915B', 'VOLUNTARY'],
                        modifiedGeoAreaServed: true,
                        contractDocuments: {
                            create: {
                                id: uuidv4(),
                                s3url: 'foo://bar',
                                title: 'someDoc',
                            }
                        },
                        additionalDocuments: {
                            create: [
                            {
                                id: uuidv4(),
                                s3url: 'foo://baz',
                                title: 'adddoc',
                            },
                            {
                                id: uuidv4(),
                                s3url: 'foo://foo',
                                title: 'addadddoc',
                            }]
                        }
                    },
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

        console.log('created', contractRev)

        return {
            id: contractRev.id,
            contractFormData: contractRev.draftFormData.contractDescription || 'NOTHING',
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
