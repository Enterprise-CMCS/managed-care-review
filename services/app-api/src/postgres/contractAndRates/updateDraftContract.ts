import {
    ContractType as PrismaContractType,
    PopulationCoverageType,
    PrismaClient,
    SubmissionType,
} from '@prisma/client'
import { ContractType } from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import { findContractWithHistory } from './findContractWithHistory'
import { StoreError, convertPrismaErrorToStoreError } from '../storeError'

type UpdateContractArgsType = {
    populationCovered: PopulationCoverageType
    programIDs: string[]
    riskBasedContract: boolean
    submissionType: SubmissionType
    submissionDescription: string
    contractType: PrismaContractType
}

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftContract(
    client: PrismaClient,
    contractID: string,
    formData: UpdateContractArgsType,
    rateIDs: string[]
): Promise<ContractType | StoreError | Error> {
    try {
        // Given all the Rates associated with this draft, find the most recent submitted
        // rateRevision to update.
        const currentRev = await client.contractRevisionTable.findFirstOrThrow({
            where: {
                contractID: contractID,
                submitInfoID: null,
            },
        })

        await client.contractRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                populationCovered: formData.populationCovered,
                programIDs: formData.programIDs,
                riskBasedContract: formData.riskBasedContract,
                submissionType: formData.submissionType,
                submissionDescription: formData.submissionDescription,
                contractType: formData.contractType,
                draftRates: {
                    set: rateIDs.map((rID) => ({
                        id: rID,
                    })),
                },
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    },
                },
            },
        })

        return findContractWithHistory(client, contractID)
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return convertPrismaErrorToStoreError(err)
    }
}

export { updateDraftContract }
