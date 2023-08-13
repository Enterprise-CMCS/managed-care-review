import { Prisma } from '@prisma/client'
import {
    ContractRevisionType,
    RateRevisionWithContractsType,
} from '../../domain-models/contractAndRates'
import { contractRevisionToDomainModel } from './parseContractWithHistory'
import {
    includeContractFormData,
    includeUpdateInfo,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'
import { RateRevisionTableWithContracts } from './prismaSubmittedRateHelpers'

const includeDraftContracts = {
    revisions: {
        include: {
            ...includeContractFormData,
            submitInfo: includeUpdateInfo,
            unlockInfo: includeUpdateInfo,
        },
        take: 1,
        orderBy: {
            createdAt: 'desc',
        },
    },
} satisfies Prisma.ContractTableInclude

type DraftContractsTable = Prisma.ContractTableGetPayload<{
    include: typeof includeDraftContracts
}>

function draftContractsToDomainModel(
    draftContracts: DraftContractsTable[]
): ContractRevisionType[] {
    return draftContracts.map((dc) =>
        contractRevisionToDomainModel(dc.revisions[0])
    )
}

// -----------

function draftRateRevToDomainModel(
    revision: RateRevisionTableWithContracts
): RateRevisionWithContractsType {
    return {
        id: revision.id,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        formData: rateFormDataToDomainModel(revision),
        contractRevisions: draftContractsToDomainModel(revision.draftContracts),
    }
}

export { includeDraftContracts, draftRateRevToDomainModel }
