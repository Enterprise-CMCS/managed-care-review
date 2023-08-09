import { ContractTable, RateTable } from '@prisma/client'
import {
    ContractRevisionWithRatesType,
    ContractType,
    RateRevisionType,
} from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import {
    contractFormDataToDomainModel,
    ContractRevisionTableWithFormData,
    getContractStatus,
    includeUpdateInfo,
    rateReivisionToDomainModel,
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

type DraftRateWithRelations = RateTable & {
    revisions: RateRevisionTableWithFormData[]
}

type DraftContractRevisionTableWithRelations =
    ContractRevisionTableWithFormData & {
        draftRates: DraftRateWithRelations[]
    }

type DraftContractTableWithRelations = ContractTable & {
    revisions: DraftContractRevisionTableWithRelations[]
}

function draftRatesToDomainModel(
    draftRates: DraftRateWithRelations[]
): RateRevisionType[] {
    return draftRates.map((dr) => rateReivisionToDomainModel(dr.revisions[0]))
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
}

export {
    includeDraftContractRevisionsWithDraftRates,
    draftContractToDomainModel,
    draftContractRevToDomainModel,
}
