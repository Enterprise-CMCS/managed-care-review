import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { Contract } from './contractType'
import { ContractFormData } from '../prismaTypes'

async function incrementAndGetStateNumber(
    client: PrismaClient,
    stateCode: string
): Promise<number | Error> {
    try {
        const stateNumberResult = await client.state.update({
            data: {
                latestStateSubmissionNumber: {
                    increment: 1,
                },
            },
            where: {
                stateCode: stateCode,
            },
        })

        return stateNumberResult.latestStateSubmissionNumber
    } catch (e) {
        return e
    }
}

// creates a new contract, with a new revision
async function insertDraftContract(
    client: PrismaClient,
    formData: ContractFormData
): Promise<Contract | Error> {
    const stateNumberResult = await incrementAndGetStateNumber(
        client,
        formData.stateCode
    )

    if (stateNumberResult instanceof Error) {
        console.error('CONTRACT PRISMA ERR', stateNumberResult)
        return stateNumberResult
    }

    try {
        const contract = await client.contractTable.create({
            data: {
                id: uuidv4(),
                stateCode: 'MN',
                stateNumber: stateNumberResult,
                revisions: {
                    create: {
                        id: uuidv4(),
                        submissionType: formData.submissionType,
                        submissionDescription: formData.submissionDescription,
                    },
                },
            },
            include: {
                revisions: {
                    include: {
                        rateRevisions: {
                            include: {
                                rateRevision: true,
                            },
                        },
                    },
                },
            },
        })

        return {
            id: contract.id,
            revisions: contract.revisions.map((cr) => ({
                id: cr.id,
                contractFormData: cr.submissionDescription ?? '',
                rateRevisions: cr.rateRevisions.map((rr) => ({
                    id: rr.rateRevisionID,
                    revisionFormData: rr.rateRevision.name,
                })),
            })),
        }
    } catch (err) {
        console.error('CONTRACT PRISMA ERR', err)
        return err
    }
}

export { insertDraftContract }
