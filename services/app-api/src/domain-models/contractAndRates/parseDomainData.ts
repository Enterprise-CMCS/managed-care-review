import {
    ContractTableWithRelations,
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
} from '../../postgres/prismaTypes'
import {
    Contract,
    ContractRevision,
    contractRevisionZodSchema,
    draftContractZodSchema,
    contractZodSchema,
} from './contractAndRatesZodSchema'
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
            `ERROR: attempting to parse prisma draft contract revision failed: ${parseDraft.error}`
        )
        return parseDraft.error
    }

    return parseDraft.data
}

function parseDraftContract(
    contract: DraftContractTableWithRelations
): Contract | Error {
    const draftContract = draftContractToDomainModel(contract)

    const parseDraft = draftContractZodSchema.safeParse(draftContract)

    if (!parseDraft.success) {
        console.warn(
            `ERROR: attempting to parse prisma draft contract failed: ${parseDraft.error}`
        )
        return parseDraft.error
    }

    return parseDraft.data
}

// parseContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
function parseContractWithHistory(
    contract: ContractTableWithRelations
    //contractRevisions: ContractRevisionTableWithRelations[]
): Contract | Error {
    const contractWithHistory = contractWithHistoryToDomainModel(contract)

    if (contractWithHistory instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma contract with history failed: ${contractWithHistory.message}`
        )
        return contractWithHistory
    }

    const parseContract = contractZodSchema.safeParse(contractWithHistory)

    if (!parseContract.success) {
        const error = `ERROR: attempting to parse prisma contract with history failed: ${parseContract.error}`
        console.warn(error)
        return parseContract.error
    }

    return parseContract.data
}

export {
    parseDraftContractRevision,
    parseDraftContract,
    parseContractWithHistory,
}
