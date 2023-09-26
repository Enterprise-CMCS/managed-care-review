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
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        formData: contractFormDataToDomainModel(revision),
        rateRevisions,
    }
}

export { includeDraftRates, draftContractRevToDomainModel }
