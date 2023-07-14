import {
    ContractDocument,
    ContractRevisionTable,
    ContractSupportingDocument,
    FederalAuthority,
    ManagedCareEntity,
    PrismaClient,
    RateRevisionsOnContractRevisionsTable,
    RateRevisionTable,
    RateTable,
    StateContact,
    UpdateInfoTable,
    User,
    ContractTable,
} from '@prisma/client'

// This is the type returned by client.$transaction
type PrismaTransactionType = Omit<
    PrismaClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>

type RateRevisionWithRelations = RateRevisionsOnContractRevisionsTable & {
    rateRevision: RateRevisionTable & {
        submitInfo?: UpdateInfoTableWithUpdater | null
        unlockInfo?: UpdateInfoTableWithUpdater | null
    }
}

type DraftRateWithRelations = RateTable & {
    revisions: RateRevisionTable[]
}

type ContractRevisionTableWithRelations = ContractRevisionTable & {
    submitInfo?: UpdateInfoTableWithUpdater | null
    unlockInfo?: UpdateInfoTableWithUpdater | null
    stateContacts: StateContact[]
    contractDocuments: ContractDocument[]
    supportingDocuments: ContractSupportingDocument[]
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
    rateRevisions: RateRevisionWithRelations[]
}

type DraftContractRevisionTableWithRelations = ContractRevisionTable & {
    submitInfo?: UpdateInfoTableWithUpdater | null
    unlockInfo?: UpdateInfoTableWithUpdater | null
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    contractDocuments: ContractDocument[]
    supportingDocuments: ContractSupportingDocument[]
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
    draftRates: DraftRateWithRelations[]
}

type DraftContractTableWithRelations = ContractTable & {
    revisions: DraftContractRevisionTableWithRelations[]
}

type ContractTableWithRelations = ContractTable & {
    revisions: ContractRevisionTableWithRelations[]
}

type ContractRevisionFormDataType = Omit<
    | ContractRevisionTableWithRelations
    | DraftContractRevisionTableWithRelations,
    'rateRevisions' | 'draftRates'
>

type UpdateInfoTableWithUpdater = UpdateInfoTable & { updatedBy: User }

export type {
    PrismaTransactionType,
    UpdateInfoTableWithUpdater,
    ContractRevisionTableWithRelations,
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
    RateRevisionWithRelations,
    DraftRateWithRelations,
    ContractRevisionFormDataType,
    ContractTableWithRelations,
}
