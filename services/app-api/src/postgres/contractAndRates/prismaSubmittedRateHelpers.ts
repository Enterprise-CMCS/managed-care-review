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
    rateOverrides: {
        include: {
            updatedBy: true,
        },
    },
} satisfies Prisma.RateTableInclude

const includeSubmissionPackageContractRevision = {
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
} satisfies Prisma.ContractRevisionTableInclude

type SubmissionPackageContractRevisionData =
    Prisma.ContractRevisionTableGetPayload<{
        include: typeof includeSubmissionPackageContractRevision
    }>

const includeStrippedRateWithoutDraftContracts = {
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
    rateOverrides: {
        include: {
            updatedBy: true,
        },
    },
} satisfies Prisma.RateTableInclude

const includeRateRevisionWithRelatedSubmissionContracts = {
    submitInfo: {
        select: {
            id: true,
            updatedAt: true,
            updatedReason: true,
            submittedContracts: {
                select: {
                    contractID: true,
                },
            },
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
            updatedAt: 'desc',
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
                                        include:
                                            includeSubmissionPackageContractRevision,
                                    },
                                    reviewStatusActions: {
                                        orderBy: {
                                            updatedAt: 'desc',
                                        },
                                        take: 1,
                                        include: {
                                            updatedBy: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        take: 1,
    },
} satisfies Prisma.RateRevisionTableInclude

const includeRateRelatedContracts = {
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: includeRateRevisionWithRelatedSubmissionContracts,
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

type RateRevisionTableWithRelatedSubmissionContracts =
    Prisma.RateRevisionTableGetPayload<{
        include: typeof includeRateRevisionWithRelatedSubmissionContracts
    }>

export {
    includeRateWithoutDraftContracts,
    includeLatestSubmittedRateRev,
    includeStrippedRateWithoutDraftContracts,
    includeRateRelatedContracts,
    includeRateRevisionWithRelatedSubmissionContracts,
    includeSubmissionPackageContractRevision,
}

export type {
    RateTableWithoutDraftContractsPayload,
    RateTableWithoutDraftContractsStrippedPayload,
    RateRevisionsTableStrippedPayload,
    RateRevisionTablePayload,
    RateTableWithRelatedContractsPayload,
    RateRevisionTableWithRelatedSubmissionContracts,
    SubmissionPackageContractRevisionData,
}
