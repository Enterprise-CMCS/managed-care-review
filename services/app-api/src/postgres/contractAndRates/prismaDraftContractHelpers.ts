import type { Prisma } from '@prisma/client'
import type {
    ContractRevisionWithRatesType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    includeUpdateInfo,
    rateRevisionToDomainModel,
} from './prismaSharedContractRateHelpers'
import type { ContractRevisionTableWithRates } from './prismaSubmittedContractHelpers'

const includeDraftRates = {
    revisions: {
        include: {
            rateDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
            supportingDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
            certifyingActuaryContacts: {
                orderBy: {
                    position: 'asc',
                },
            },
            addtlActuaryContacts: {
                orderBy: {
                    position: 'asc',
                },
            },
            submitInfo: includeUpdateInfo,
            unlockInfo: includeUpdateInfo,
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
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        formData: contractFormDataToDomainModel(revision),
        rateRevisions: draftRatesToDomainModel(revision.draftRates),
    }
}

export { includeDraftRates, draftContractRevToDomainModel }
