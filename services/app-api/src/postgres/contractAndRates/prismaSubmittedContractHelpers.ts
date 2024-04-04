import type { Prisma } from '@prisma/client'
import { includeDraftRates } from './prismaDraftContractHelpers'
import {
    includeContractFormData,
    includeRateFormData,
} from './prismaSharedContractRateHelpers'
import { includeFullRate } from './prismaSubmittedRateHelpers'

// Generated Types

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
} satisfies Prisma.ContractTableInclude

// The include parameters for everything in a Contract.
const includeFullContract = {
    draftRates: {
        orderBy: {
            ratePosition: 'asc',
        },
        include: {
            rate: {
                include: includeFullRate,
            },
        },
    },
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            ...includeContractFormData,

            relatedSubmisions: {
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
                            rateRevision: {
                                include: includeRateFormData,
                            },
                        },
                        orderBy: {
                            ratePosition: 'asc',
                        }
                    },
                },
            },

            draftRates: {
                include: includeDraftRates,
            },

            rateRevisions: {
                include: {
                    rateRevision: {
                        include: includeRateFormData,
                    },
                },
                orderBy: {
                    validAfter: 'asc',
                },
            },
        },
    },
} satisfies Prisma.ContractTableInclude

// ContractTableFullPayload is the type returned by any ContractTable find prisma query given the
// includeFullContract include: parameter.
// See https://www.prisma.io/blog/satisfies-operator-ur8ys8ccq7zb for a discussion of how
// the satisfies keyword enables the construction of this type.
type ContractTableFullPayload = Prisma.ContractTableGetPayload<{
    include: typeof includeFullContract
}>

type ContractRevisionTableWithRates = ContractTableFullPayload['revisions'][0]

export { includeFullContract, includeLatestSubmittedRateRev }

export type { ContractRevisionTableWithRates, ContractTableFullPayload }
