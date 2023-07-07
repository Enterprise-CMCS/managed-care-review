import { PrismaClient } from '@prisma/client'
import { Rate } from './rateType'

type InsertRateArgsType = {
    stateCode: string
    name: string
}

// creates a new contract, with a new revision
async function insertDraftRate(
    client: PrismaClient,
    formData: InsertRateArgsType
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
                    stateCode: formData.stateCode,
                },
            })

            const rate = await tx.rateTable.create({
                data: {
                    stateCode: formData.stateCode,
                    stateNumber: latestStateRateCertNumber,
                    revisions: {
                        create: {
                            name: formData.name,
                        },
                    },
                },
                include: {
                    revisions: {
                        include: {
                            contractRevisions: {
                                include: {
                                    contractRevision: true,
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
                    contractRevisions: rr.contractRevisions.map((cr) => ({
                        id: cr.rateRevisionID,
                        contractFormData: cr.contractRevision.submissionType,
                        rateRevisions: [],
                    })),
                })),
            }
        })
    } catch (err) {
        console.error('RATE PRISMA ERR', err)
        return err
    }
}

export { insertDraftRate }
