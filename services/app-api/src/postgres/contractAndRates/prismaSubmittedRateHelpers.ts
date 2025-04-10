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
    reviewStatusActions: {
        include: {
            updatedBy: true,
        },
        orderBy: {
            updatedAt: 'asc',
        },
    },
} satisfies Prisma.RateTableInclude

const includeStrippedRateWithoutDraftContracts = {
    withdrawInfo: includeUpdateInfo,
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            submitInfo: {
                include: {
                    updatedBy: true,
                    submittedContracts: {
                        select: {
                            id: true,
                            contractID: true,
                        },
                    },
                },
            },
            unlockInfo: includeUpdateInfo,
            relatedSubmissions: {
                orderBy: {
                    updatedAt: 'asc',
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
} satisfies Prisma.RateTableInclude

const includeRateRelatedContracts = {
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            submitInfo: {
                select: {
                    id: true,
                    updatedAt: true,
                    updatedReason: true,
                },
            },
            unlockInfo: {
                select: {
                    id: true,
                    updatedAt: true,
                    updatedReason: true,
                },
            },
            relatedSubmissions: {
                orderBy: {
                    updatedAt: 'asc',
                },
                include: {
                    submissionPackages: {
                        include: {
                            contractRevision: {
                                select: {
                                    createdAt: true,
                                    contract: {
                                        select: {
                                            id: true,
                                            revisions: {
                                                orderBy: {
                                                    updatedAt: 'desc',
                                                },
                                                take: 1,
                                                select: {
                                                    unlockInfo: {
                                                        select: {
                                                            id: true,
                                                            updatedAt: true,
                                                            updatedReason: true,
                                                        },
                                                    },
                                                    submitInfo: {
                                                        select: {
                                                            id: true,
                                                            updatedAt: true,
                                                            updatedReason: true,
                                                        },
                                                    },
                                                },
                                            },
                                            reviewStatusActions: {
                                                orderBy: {
                                                    updatedAt: 'desc',
                                                },
                                                take: 1,
                                                select: {
                                                    id: true,
                                                    updatedAt: true,
                                                    updatedReason: true,
                                                    actionType: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
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

type RateTableWithoutDraftContractsStrippedPayload =
    Prisma.RateTableGetPayload<{
        include: typeof includeStrippedRateWithoutDraftContracts
    }>

type RateTableWithRelatedContractsPayload = Prisma.RateTableGetPayload<{
    include: typeof includeRateRelatedContracts
}>

type RateRevisionsTableStrippedPayload =
    RateTableWithoutDraftContractsStrippedPayload['revisions']
type RateRevisionTablePayload =
    RateTableWithoutDraftContractsPayload['revisions']

export {
    includeRateWithoutDraftContracts,
    includeLatestSubmittedRateRev,
    includeStrippedRateWithoutDraftContracts,
    includeRateRelatedContracts,
}

export type {
    RateTableWithoutDraftContractsPayload,
    RateTableWithoutDraftContractsStrippedPayload,
    RateRevisionsTableStrippedPayload,
    RateRevisionTablePayload,
    RateTableWithRelatedContractsPayload,
}
