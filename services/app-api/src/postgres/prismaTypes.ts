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
    RateDocument,
    RateSupportingDocument,
    ActuaryContact,
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

type RateOnContractHistory = RateRevisionsOnContractRevisionsTable & {
    rateRevision: RateRevisionTable & {
        submitInfo?: UpdateInfoTableWithUpdater | null
        unlockInfo?: UpdateInfoTableWithUpdater | null
        rateDocuments: RateDocument[]
        supportingDocuments: RateSupportingDocument[]
        certifyingActuaryContacts: ActuaryContact[]
        addtlActuaryContacts: ActuaryContact[]
    }
}

type RateRevisionTableWithFormData = RateRevisionTable & {
    submitInfo?: UpdateInfoTableWithUpdater | null
    unlockInfo?: UpdateInfoTableWithUpdater | null
    rateDocuments: RateDocument[]
    supportingDocuments: RateSupportingDocument[]
    certifyingActuaryContacts: ActuaryContact[]
    addtlActuaryContacts: ActuaryContact[]
}
type DraftRateWithRelations = RateTable & {
    revisions: RateRevisionTableWithFormData[]
}

type ContractRevisionTableWithFormData = ContractRevisionTable & {
    submitInfo?: UpdateInfoTableWithUpdater | null
    unlockInfo?: UpdateInfoTableWithUpdater | null
    stateContacts: StateContact[]
    contractDocuments: ContractDocument[]
    supportingDocuments: ContractSupportingDocument[]
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
}

type ContractRevisionTableWithRates = ContractRevisionTableWithFormData & {
    rateRevisions: RateOnContractHistory[]
}

type DraftContractRevisionTableWithRelations = ContractRevisionTable & {
    submitInfo?: UpdateInfoTableWithUpdater | null
    unlockInfo?: UpdateInfoTableWithUpdater | null
    stateContacts: StateContact[]
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
    revisions: ContractRevisionTableWithRates[]
}

type ContractRevisionFormDataType = Omit<
    ContractRevisionTableWithRates | DraftContractRevisionTableWithRelations,
    'rateRevisions' | 'draftRates'
>

type UpdateInfoTableWithUpdater = UpdateInfoTable & { updatedBy: User }

export type {
    PrismaTransactionType,
    UpdateInfoTableWithUpdater,
    ContractRevisionTableWithRates,
    ContractRevisionTableWithFormData,
    DraftContractRevisionTableWithRelations,
    DraftContractTableWithRelations,
    RateRevisionWithRelations,
    DraftRateWithRelations,
    RateRevisionTableWithFormData,
    ContractRevisionFormDataType,
    ContractTableWithRelations,
}
