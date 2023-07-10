import {
    ActuaryContact,
    ContractDocument,
    ContractRevisionTable,
    ContractSupportingDocument,
    FederalAuthority,
    ManagedCareEntity,
    PrismaClient,
    RateRevisionsOnContractRevisionsTable,
    RateRevisionTable,
    StateContact,
    UpdateInfoTable,
    User,
} from '@prisma/client'

// This is the type returned by client.$transaction
type PrismaTransactionType = Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>

// For use in prisma queries, include the updater in an updateInfo
const updateInfoIncludeUpdater = {
    include: {
        updatedBy: true,
    },
}

const draftContractRevisionsWithDraftRates = {
    stateContacts: true,
    addtlActuaryContacts: true,
    contractDocuments: true,
    supportingDocuments: true,
    draftRates: {
        include: {
            revisions: {
                include: {
                    submitInfo: updateInfoIncludeUpdater,
                    unlockInfo: updateInfoIncludeUpdater,
                },
                where: {
                    submitInfoID: { not: null },
                },
                take: 1,
                orderBy: {
                    createdAt: 'desc',
                },
            },
        },
    },
} as const

type ContractRevisionTableWithRelations = ContractRevisionTable & {
    submitInfo?: UpdateInfoTableWithUpdater | null
    unlockInfo?: UpdateInfoTableWithUpdater | null
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    contractDocuments: ContractDocument[]
    supportingDocuments: ContractSupportingDocument[]
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
    rateRevisions: (RateRevisionsOnContractRevisionsTable & {
        rateRevision: RateRevisionTable
    })[]
}

type UpdateInfoTableWithUpdater = UpdateInfoTable & { updatedBy: User }

export type {
    PrismaTransactionType,
    UpdateInfoTableWithUpdater,
    ContractRevisionTableWithRelations,
}

export { updateInfoIncludeUpdater, draftContractRevisionsWithDraftRates }
