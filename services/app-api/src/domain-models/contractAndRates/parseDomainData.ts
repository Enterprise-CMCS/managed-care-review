import {
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
} from '../../postgres/prismaTypes'
import {
    ContractType,
    ContractRevisionType,
    contractRevisionZodSchema,
    draftContractZodSchema,
} from './contractAndRatesZodSchema'
import {
    draftContractToDomainModel,
    draftContractRevToDomainModel,
} from '../../postgres/contractAndRates/prismaToDomainModel'

function parseDraftContractRevision(
    revision: DraftContractRevisionTableWithRelations
): ContractRevisionType | Error {
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
): ContractType | Error {
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

export { parseDraftContractRevision, parseDraftContract }
