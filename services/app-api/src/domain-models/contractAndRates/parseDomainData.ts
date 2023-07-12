import {
    ContractRevisionTableWithRelations,
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
} from '../../postgres/prismaTypes'
import {
    Contract,
    ContractRevision,
    contractRevisionZodSchema,
    draftContractZodSchema,
    submittedContractZodSchema,
} from './contractAndRatesZodSchema'
import { ContractTable } from '@prisma/client'
import {
    draftContractToDomainModel,
    draftContractRevToDomainModel,
    contractWithHistoryToDomainModel,
} from '../../postgres/contractAndRates/prismaToDomainModel'

function parseDraftContractRevision(
    revision: DraftContractRevisionTableWithRelations
): ContractRevision | Error {
    const draftContractRevision = draftContractRevToDomainModel(revision)
    const parseDraft = contractRevisionZodSchema.safeParse(
        draftContractRevision
    )

    if (!parseDraft.success) {
        console.warn(
            `ERROR: attempting to parse prisma draft contract revision failed, ${parseDraft.error}`
        )
        return Error(
            `ERROR: attempting to parse prisma draft contract revision failed, ${parseDraft.error}`
        )
    }

    return draftContractRevision
}

function parseDraftContract(
    contract: DraftContractTableWithRelations
): Contract | Error {
    const draftContract = draftContractToDomainModel(contract)
    const parseDraft = draftContractZodSchema.safeParse(draftContract)

    if (!parseDraft.success) {
        console.warn(
            `ERROR: attempting to parse prisma draft contract failed, ${parseDraft.error}`
        )
        const newError = new Error(
            `ERROR: attempting to parse prisma draft contract failed, ${parseDraft.error}`
        )

        newError.stack
    }

    return draftContract
}

// parseContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
function parseContractWithHistory(
    contract: ContractTable,
    contractRevisions: ContractRevisionTableWithRelations[]
): Contract | Error {
    const contractWithHistory = contractWithHistoryToDomainModel(
        contract,
        contractRevisions
    )
    const parseContract =
        submittedContractZodSchema.safeParse(contractWithHistory)

    if (!parseContract.success) {
        console.warn(
            `ERROR: attempting to parse prisma contract with history failed, ${parseContract.error}`
        )
        return new Error(
            `ERROR: attempting to parse prisma contract with history failed, ${parseContract.error}`
        )
    }

    return contractWithHistory
}

export {
    parseDraftContractRevision,
    parseDraftContract,
    parseContractWithHistory,
}
