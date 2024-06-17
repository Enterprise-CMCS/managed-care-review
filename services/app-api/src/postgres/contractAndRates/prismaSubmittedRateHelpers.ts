import type { Prisma } from '@prisma/client'
import {
    includeContractFormData,
    includeRateFormData,
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

// includeFullRate is the prisma includes block for a complete Rate
const includeFullRate = {
    draftContracts: true,
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

// RateTableFullPayload is the type returned by any RateTable find prisma query given the
// includeFullRate include: parameter.
// See https://www.prisma.io/blog/satisfies-operator-ur8ys8ccq7zb for a discussion of how
// the satisfies keyword enables the construction of this type.
type RateTableFullPayload = Prisma.RateTableGetPayload<{
    include: typeof includeFullRate
}>

type RateRevisionTableWithContracts = RateTableFullPayload['revisions'][0]

export { includeFullRate, includeLatestSubmittedRateRev }

export type { RateTableFullPayload, RateRevisionTableWithContracts }
