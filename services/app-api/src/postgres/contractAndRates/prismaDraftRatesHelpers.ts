import type { Prisma } from '@prisma/client'
import type {
    ContractRevisionType,
    RateRevisionWithContractsType,
} from '../../domain-models/contractAndRates'
import type { RateRevisionTableWithContracts } from './prismaSubmittedRateHelpers'
import { contractRevisionToDomainModel } from './parseContractWithHistory'
import {
    convertUpdateInfoToDomainModel,
    includeContractFormData,
    includeUpdateInfo,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'

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
): RateRevisionWithContractsType | Error {
    const formData = rateFormDataToDomainModel(revision)

    if (formData instanceof Error) {
        return formData
    }

    return {
        id: revision.id,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        formData,
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        contractRevisions: draftContractsToDomainModel(revision.draftContracts),
    }
}

export { includeDraftContracts, draftRateRevToDomainModel }
