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
} satisfies Prisma.ContractTableInclude

type ContractTableWithoutDraftRates = Prisma.ContractTableGetPayload<{
    include: typeof includeContractWithoutDraftRates
}>

export { includeContractWithoutDraftRates, includeLatestSubmittedRateRev }

export type { ContractTableWithoutDraftRates }
