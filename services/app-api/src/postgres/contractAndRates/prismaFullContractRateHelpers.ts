import type { Prisma } from '@prisma/client'
import { includeContractWithoutDraftRates } from './prismaSubmittedContractHelpers'
import {
    includeRateWithoutDraftContracts,
    includeStrippedRateWithoutDraftContracts,
} from './prismaSubmittedRateHelpers'

const includeFullContract = {
    ...includeContractWithoutDraftRates,
    withdrawnRates: {
        include: {
            rate: {
                include: includeRateWithoutDraftContracts,
            },
        },
    },
    draftRates: {
        orderBy: {
            ratePosition: 'asc',
        },
        include: {
            rate: {
                include: includeRateWithoutDraftContracts,
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

const includeFullRate = {
    ...includeRateWithoutDraftContracts,
    withdrawnFromContracts: {
        include: {
            contract: {
                include: includeContractWithoutDraftRates,
            },
        },
    },

    draftContracts: {
        include: {
            contract: {
                include: includeContractWithoutDraftRates,
            },
        },
    },
} satisfies Prisma.RateTableInclude

const includeStrippedRate = {
    ...includeStrippedRateWithoutDraftContracts,
    draftContracts: {
        select: {
            contractID: true,
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

type RateTableStrippedPayload = Prisma.RateTableGetPayload<{
    include: typeof includeStrippedRate
}>

type RateRevisionTableWithContracts = RateTableFullPayload['revisions'][0]

export { includeFullContract, includeFullRate, includeStrippedRate }

export type {
    ContractTableFullPayload,
    ContractRevisionTableWithRates,
    RateTableFullPayload,
    RateRevisionTableWithContracts,
    RateTableStrippedPayload,
}
