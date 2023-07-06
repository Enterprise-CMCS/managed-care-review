import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { Rate } from './rateType'
import { RateFormData } from '../prismaTypes'

async function incrementAndGetStateRateNumber(
    client: PrismaClient,
    stateCode: string
): Promise<number | Error> {
    try {
        const stateNumberResult = await client.state.update({
            data: {
                latestStateRateCertNumber: {
                    increment: 1,
                },
            },
            where: {
                stateCode: stateCode,
            },
        })

        return stateNumberResult.latestStateRateCertNumber
    } catch (e) {
        return e
    }
}

// creates a new contract, with a new revision
async function insertDraftRate(
    client: PrismaClient,
    formData: RateFormData
): Promise<Rate | Error> {
    const stateRateNumberResult = await incrementAndGetStateRateNumber(
        client,
        formData.stateCode
    )

    if (stateRateNumberResult instanceof Error) {
        console.error('RATE PRISMA ERR', stateRateNumberResult)
        return stateRateNumberResult
    }

    try {
        const rate = await client.rateTable.create({
            data: {
                id: uuidv4(),
                stateCode: 'MN',
                stateNumber: stateRateNumberResult,
                revisions: {
                    create: {
                        id: uuidv4(),
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
    } catch (err) {
        console.error('RATE PRISMA ERR', err)
        return err
    }
}

export { insertDraftRate }
