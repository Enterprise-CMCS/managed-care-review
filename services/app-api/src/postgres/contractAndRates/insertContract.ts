import {
    PrismaClient,
    PopulationCoverageType,
    SubmissionType,
    ContractType,
} from '@prisma/client'
import { Contract } from './contractType'

type InsertContractArgsType = {
    stateCode: string
    populationCovered?: PopulationCoverageType
    programIDs: string[]
    riskBasedContract?: boolean
    submissionType: SubmissionType
    submissionDescription: string
    contractType: ContractType
}

// creates a new contract, with a new revision
async function insertDraftContract(
    client: PrismaClient,
    formData: InsertContractArgsType
): Promise<Contract | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const { latestStateSubmissionNumber } = await tx.state.update({
                data: {
                    latestStateSubmissionNumber: {
                        increment: 1,
                    },
                },
                where: {
                    stateCode: formData.stateCode,
                },
            })

            const contract = await tx.contractTable.create({
                data: {
                    stateCode: formData.stateCode,
                    stateNumber: latestStateSubmissionNumber,
                    revisions: {
                        create: {
                            populationCovered: formData.populationCovered,
                            programIDs: formData.programIDs,
                            riskBasedContract: formData.riskBasedContract,
                            submissionType: formData.submissionType,
                            submissionDescription:
                                formData.submissionDescription,
                            contractType: formData.contractType,
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
                    contractFormData: cr.submissionDescription,
                    rateRevisions: cr.rateRevisions.map((rr) => ({
                        id: rr.rateRevisionID,
                        revisionFormData: rr.rateRevision.name,
                    })),
                })),
            }
        })
    } catch (err) {
        console.error('CONTRACT PRISMA ERR', err)
        return err
    }
}

export { insertDraftContract }
