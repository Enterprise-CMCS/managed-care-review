import { PrismaClient } from '@prisma/client'
import { Rate } from '../../domain-models/contractAndRates/rateType'
import { contractFormDataToDomainModel } from './prismaToDomainModel'

type InsertRateArgsType = {
    stateCode: string
    name: string
}

// creates a new contract, with a new revision
async function insertDraftRate(
    client: PrismaClient,
    args: InsertRateArgsType
): Promise<Rate | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const { latestStateRateCertNumber } = await tx.state.update({
                data: {
                    latestStateRateCertNumber: {
                        increment: 1,
                    },
                },
                where: {
                    stateCode: args.stateCode,
                },
            })

            const rate = await tx.rateTable.create({
                data: {
                    stateCode: args.stateCode,
                    stateNumber: latestStateRateCertNumber,
                    revisions: {
                        create: {
                            name: args.name,
                        },
                    },
                },
                include: {
                    revisions: {
                        include: {
                            contractRevisions: {
                                include: {
                                    contractRevision: {
                                        include: {
                                            rateRevisions: {
                                                include: {
                                                    rateRevision: true,
                                                },
                                            },
                                            stateContacts: true,
                                            contractDocuments: true,
                                            supportingDocuments: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            })

            return {
                id: rate.id,
                revisions: rate.revisions.map((rr) => ({
                    id: rr.id,
                    revisionFormData: rr.name,
                    contractRevisions: rr.contractRevisions.map(
                        ({ contractRevision }) => ({
                            id: contractRevision.id,
                            createdAt: contractRevision.createdAt,
                            updatedAt: contractRevision.updatedAt,
                            formData:
                                contractFormDataToDomainModel(contractRevision),
                            rateRevisions: contractRevision.rateRevisions.map(
                                (rr) => ({
                                    id: rr.rateRevisionID,
                                    revisionFormData: rr.rateRevision.name,
                                })
                            ),
                        })
                    ),
                })),
            }
        })
    } catch (err) {
        console.error('RATE PRISMA ERR', err)
        return err
    }
}

export { insertDraftRate }
