import type { Prisma } from '@prisma/client'
import type {
    ContractRevisionWithRatesType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    includeRateFormData,
    rateRevisionToDomainModel,
} from './prismaSharedContractRateHelpers'
import type { ContractRevisionTableWithRates } from './prismaSubmittedContractHelpers'

const includeDraftRates = {
    revisions: {
        include: includeRateFormData,
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
): RateRevisionType[] | Error {
    const domainRates: RateRevisionType[] = []

    for (const rate of draftRates) {
        const domainRate = rateRevisionToDomainModel(rate.revisions[0])

        if (domainRate instanceof Error) {
            return domainRate
        }

        domainRates.push(domainRate)
    }

    return domainRates
}

// -------------------

function draftContractRevToDomainModel(
    revision: ContractRevisionTableWithRates
): ContractRevisionWithRatesType | Error {
    const rateRevisions = draftRatesToDomainModel(revision.draftRates)

    if (rateRevisions instanceof Error) {
        return rateRevisions
    }

    return {
        id: revision.id,
        contract: revision.contract,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        formData: contractFormDataToDomainModel(revision),
        rateRevisions,
    }
}

export { includeDraftRates, draftContractRevToDomainModel }
