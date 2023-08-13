import { Prisma } from '@prisma/client'
import { includeDraftContracts } from './prismaDraftRatesHelpers'
import {
    includeContractFormData,
    includeRateFormData,
} from './prismaSharedContractRateHelpers'

// includeFullRate is the prisma includes block for a complete Rate
const includeFullRate = {
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            ...includeRateFormData,

            draftContracts: {
                include: includeDraftContracts,
            },

            contractRevisions: {
                include: {
                    contractRevision: {
                        include: includeContractFormData,
                    },
                },
                orderBy: {
                    validAfter: 'asc',
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

export { includeFullRate }

export type { RateTableFullPayload, RateRevisionTableWithContracts }
