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
        contractID: revision.contractID,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        formData: contractFormDataToDomainModel(revision),
        rateRevisions,
    }
}

export { includeDraftRates, draftContractRevToDomainModel }
