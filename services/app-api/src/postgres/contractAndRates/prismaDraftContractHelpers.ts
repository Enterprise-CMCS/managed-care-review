import type { Prisma } from '@prisma/client'
import type {
    ContractRevisionWithRatesType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import {
    contractFormDataToDomainModel,
    includeUpdateInfo,
    rateRevisionToDomainModel,
} from './prismaSharedContractRateHelpers'
import type { ContractRevisionTableWithRates } from './prismaSubmittedContractHelpers'

const includeDraftRates = {
    revisions: {
        include: {
            rateDocuments: true,
            supportingDocuments: true,
            certifyingActuaryContacts: true,
            addtlActuaryContacts: true,
            submitInfo: includeUpdateInfo,
            unlockInfo: includeUpdateInfo,
            contractsWithSharedRateRevision: {
                include: {
                    revisions: {
                        take: 1,
                        orderBy: {
                            createdAt: 'desc',
                        },
                    },
                },
            },
        },
        take: 1,
        orderBy: {
            createdAt: 'desc',
        },
    },
} satisfies Prisma.RateTableInclude

type DraftRatesTable = Prisma.RateTableGetPayload<{
    include: typeof includeDraftRates
}>

function draftRatesToDomainModel(
    draftRates: DraftRatesTable[]
): RateRevisionType[] {
    return draftRates.map((dr) => rateRevisionToDomainModel(dr.revisions[0]))
}

// -------------------

function draftContractRevToDomainModel(
    revision: ContractRevisionTableWithRates
): ContractRevisionWithRatesType {
    return {
        id: revision.id,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        formData: contractFormDataToDomainModel(revision),
        rateRevisions: draftRatesToDomainModel(revision.draftRates),
    }
}

export { includeDraftRates, draftContractRevToDomainModel }
