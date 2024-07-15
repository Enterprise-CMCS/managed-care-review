import type { Prisma } from '@prisma/client'
import { includeContractWithoutDraftRates } from './prismaSubmittedContractHelpers'
import { includeRateWithoutDraftContracts } from './prismaSubmittedRateHelpers'

const includeFullContract = {
    ...includeContractWithoutDraftRates,

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
    draftContracts: {
        include: {
            contract: {
                include: includeContractWithoutDraftRates,
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

export { includeFullContract, includeFullRate }

export type {
    ContractTableFullPayload,
    ContractRevisionTableWithRates,
    RateTableFullPayload,
    RateRevisionTableWithContracts,
}
