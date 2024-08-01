import type { Prisma } from '@prisma/client'
import {
    includeContractFormData,
    includeRateFormData,
    includeUpdateInfo,
} from './prismaSharedContractRateHelpers'

const includeLatestSubmittedRateRev = {
    revisions: {
        where: {
            submitInfoID: { not: null },
        },
        take: 1,
        orderBy: {
            createdAt: 'desc',
        },
    },
} satisfies Prisma.RateTableInclude

// includeRateWithoutDraftContracts is the prisma includes block for a complete Rate
const includeRateWithoutDraftContracts = {
    withdrawInfo: includeUpdateInfo,
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            ...includeRateFormData,
            submitInfo: {
                include: {
                    updatedBy: true,
                    submittedContracts: true,
                },
            },

            relatedSubmissions: {
                orderBy: {
                    updatedAt: 'asc',
                },
                include: {
                    submittedContracts: {
                        include: includeContractFormData,
                    },
                    submittedRates: {
                        include: includeRateFormData,
                    },
                    updatedBy: true,
                    submissionPackages: {
                        include: {
                            contractRevision: {
                                include: includeContractFormData,
                            },
                            rateRevision: {
                                include: includeRateFormData,
                            },
                        },
                        orderBy: {
                            ratePosition: 'asc',
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.RateTableInclude

type RateTableWithoutDraftContractsPayload = Prisma.RateTableGetPayload<{
    include: typeof includeRateWithoutDraftContracts
}>

export { includeRateWithoutDraftContracts, includeLatestSubmittedRateRev }

export type { RateTableWithoutDraftContractsPayload }
