import type { Prisma } from '../../generated/client'
import {
    includeContractFormData,
    includeRateFormData,
    includeStrippedContractFormData,
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
} satisfies Prisma.ContractTableInclude

// The include parameters for everything in a Contract.
const includeContractWithoutDraftRates = {
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            ...includeContractFormData,

            relatedSubmisions: {
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
    reviewStatusActions: {
        include: {
            updatedBy: true,
        },
        orderBy: {
            updatedAt: 'asc',
        },
    },
    contractOverrides: {
        include: {
            updatedBy: true,
        },
    },
} satisfies Prisma.ContractTableInclude

type ContractTableWithoutDraftRates = Prisma.ContractTableGetPayload<{
    include: typeof includeContractWithoutDraftRates
}>

// includeStrippedContractWithoutDraftRates is the prisma includes block for a stripped Contract
const includeStrippedContractWithoutDraftRates = {
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            ...includeStrippedContractFormData,
        },
    },
    reviewStatusActions: {
        include: {
            updatedBy: true,
        },
        orderBy: {
            updatedAt: 'asc',
        },
    },
    contractOverrides: {
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            updatedBy: true,
        },
    },
} satisfies Prisma.ContractTableInclude

type ContractTableStrippedPayload = Prisma.ContractTableGetPayload<{
    include: typeof includeStrippedContractWithoutDraftRates
}>

export {
    includeContractWithoutDraftRates,
    includeLatestSubmittedRateRev,
    includeStrippedContractWithoutDraftRates,
}

export type { ContractTableWithoutDraftRates, ContractTableStrippedPayload }
