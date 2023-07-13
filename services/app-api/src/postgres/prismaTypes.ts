import {
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

type ContractRevisionTableWithRelations = ContractRevisionTable & {
    submitInfo?: UpdateInfoTableWithUpdater | null
    unlockInfo?: UpdateInfoTableWithUpdater | null
    stateContacts: StateContact[]
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
