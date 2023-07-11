import {
    PrismaClient,
    PopulationCoverageType,
    SubmissionType,
    ContractType,
} from '@prisma/client'
import { Contract } from '../../domain-models/contractAndRates/contractType'
import { contractFormDataToDomainModel } from './prismaToDomainModel'
import { draftContractRevisionsWithDraftRates } from '../prismaHelpers'

type InsertContractArgsType = {
    stateCode: string
    populationCovered: PopulationCoverageType
    programIDs: string[]
    riskBasedContract: boolean
    submissionType: SubmissionType
    submissionDescription: string
    contractType: ContractType
}

// creates a new contract, with a new revision
async function insertDraftContract(
    client: PrismaClient,
    args: InsertContractArgsType
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
                    stateCode: args.stateCode,
                },
            })

            const contract = await tx.contractTable.create({
                data: {
                    stateCode: args.stateCode,
                    stateNumber: latestStateSubmissionNumber,
                    revisions: {
                        create: {
                            populationCovered: args.populationCovered,
                            programIDs: args.programIDs,
                            riskBasedContract: args.riskBasedContract,
                            submissionType: args.submissionType,
                            submissionDescription: args.submissionDescription,
                            contractType: args.contractType,
                        },
                    },
                },
                include: {
                    revisions: {
                        include: draftContractRevisionsWithDraftRates,
                    },
                },
            })

            return {
                id: contract.id,
                status: 'DRAFT',
                stateCode: contract.stateCode,
                stateNumber: contract.stateNumber,
                revisions: contract.revisions.map((cr) => ({
                    id: cr.id,
                    createdAt: cr.createdAt,
                    updatedAt: cr.updatedAt,
                    formData: contractFormDataToDomainModel(cr),
                    rateRevisions: cr.draftRates.map((dr) => ({
                        id: dr.revisions[0].id,
                        revisionFormData: dr.revisions[0].name,
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
export type { InsertContractArgsType }
