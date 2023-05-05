import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from 'uuid'
import { UpdateInfoType } from "../../domain-models";
import { DraftValidAfterDate } from "./dbConstants";
import { ContractRevision } from "./findContract";

async function insertDraftContractRevision(
                                                                client: PrismaClient, 
                                                                contractID: string,
                                                                formData: string,
                                                                rateRevisionIds: string[],
                                                                unlockInfo?: UpdateInfoType 
                                                            ): Promise<ContractRevision | Error> {

    try {
        // const groupTime = new Date()

        // const oldRev = await client.contractRevisionTable.findFirst({
        //     where: {
        //         contractID: contractID
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
                rateRevisions: {
                    createMany: {
                        data: rateRevisionIds.map( (id) => ({ rateRevisionID: id, validAfter: DraftValidAfterDate })),
                    },
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
