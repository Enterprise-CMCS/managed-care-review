import type { Prisma } from '../../generated/client'
import {
    includeContractFormData,
    includeRateFormData,
} from '../contractAndRates/prismaSharedContractRateHelpers'

// Prisma include for fetching contracts with revision form data and
// associated rate revisions via submission packages. This is a lighter
// include than includeFullContract — it skips nested submission history
// details that aren't needed for the flatten/export use case.
const includeFlattenContract = {
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
                    updatedBy: true,
                    submissionPackages: {
                        include: {
                            rateRevision: {
                                include: {
                                    ...includeRateFormData,
                                    rate: {
                                        include: {
                                            reviewStatusActions: {
                                                include: {
                                                    updatedBy: true,
                                                },
                                                orderBy: {
                                                    updatedAt: 'asc',
                                                },
                                            },
                                        },
                                    },
                                },
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
        orderBy: {
            createdAt: 'desc',
        },
    },
} satisfies Prisma.ContractTableInclude

type FlattenContractTablePayload = Prisma.ContractTableGetPayload<{
    include: typeof includeFlattenContract
}>

export { includeFlattenContract }
export type { FlattenContractTablePayload }
