import { ContractTable, RateTable } from '@prisma/client'
import {
    ContractRevisionWithRatesType,
    ContractType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import {
    contractFormDataToDomainModel,
    ContractRevisionTableWithFormData,
    getContractStatus,
    includeUpdateInfo,
    rateRevisionToDomainModel,
    RateRevisionTableWithFormData,
} from './prismaSharedContractRateHelpers'

// This is the include that gives us draft info
const includeDraftContractRevisionsWithDraftRates = {
    stateContacts: true,
    contractDocuments: true,
    supportingDocuments: true,
    draftRates: {
        include: {
            revisions: {
                include: {
                    rateDocuments: true,
                    supportingDocuments: true,
                    certifyingActuaryContacts: true,
                    addtlActuaryContacts: true,
                    submitInfo: includeUpdateInfo,
                    unlockInfo: includeUpdateInfo,
                    draftContracts: true,
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

type DraftRateTableWithRelations = RateTable & {
    revisions: RateRevisionTableWithFormData[]
}

type DraftRateRevisionTableWithRelations = RateRevisionTableWithFormData & {
    draftContracts: DraftContractTableWithRelations[]
}

type DraftContractRevisionTableWithRelations =
    ContractRevisionTableWithFormData & {
        draftRates: DraftRateTableWithRelations[]
    }

type DraftContractTableWithRelations = ContractTable & {
    revisions: DraftContractRevisionTableWithRelations[]
}

function draftRatesToDomainModel(
    draftRates: DraftRateTableWithRelations[]
): RateRevisionType[] {
    return draftRates.map((dr) => rateRevisionToDomainModel(dr.revisions[0]))
}

function draftContractRevToDomainModel(
    revision: DraftContractRevisionTableWithRelations
): ContractRevisionWithRatesType {
    return {
        id: revision.id,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        formData: contractFormDataToDomainModel(revision),
        rateRevisions: draftRatesToDomainModel(revision.draftRates),
    }
}

function draftContractToDomainModel(
    contract: DraftContractTableWithRelations
): ContractType {
    const revisions = contract.revisions.map((cr) =>
        draftContractRevToDomainModel(cr)
    )

    return {
        id: contract.id,
        status: getContractStatus(contract.revisions),
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        revisions,
    }
}

export type {
    DraftContractTableWithRelations,
    DraftContractRevisionTableWithRelations,
    DraftRateTableWithRelations,
    DraftRateRevisionTableWithRelations,
}

export {
    includeDraftContractRevisionsWithDraftRates,
    draftContractToDomainModel,
    draftContractRevToDomainModel,
    draftRatesToDomainModel,
}
