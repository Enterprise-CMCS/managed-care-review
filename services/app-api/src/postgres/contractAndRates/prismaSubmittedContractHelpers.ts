import { ContractTable, Prisma } from '@prisma/client'
import {
    ContractRevisionTableWithFormData,
    includeUpdateInfo,
    RateOnContractHistory,
} from './prismaSharedContractRateHelpers'

// Generated Types

// The include parameters for everything in a Contract.
const includeFullContract = {
    revisions: {
        orderBy: {
            createdAt: 'asc',
        },
        include: {
            submitInfo: includeUpdateInfo,
            unlockInfo: includeUpdateInfo,
            stateContacts: true,
            contractDocuments: true,
            supportingDocuments: true,

            draftRates: {
                include: {
                    revisions: {
                        include: {
                            rateDocuments: true,
                            supportingDocuments: true,
                            certifyingActuaryContacts: true,
                            addtlActuaryContacts: true,
                            submitInfo: includeUpdateInfo,
                            unlockInfo: includeUpdateInfo,
                        },
                        take: 1,
                        where: {
                            submitInfoID: { not: null },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                    },
                },
            },

            rateRevisions: {
                include: {
                    rateRevision: {
                        include: {
                            rateDocuments: true,
                            supportingDocuments: true,
                            certifyingActuaryContacts: true,
                            addtlActuaryContacts: true,
                            submitInfo: includeUpdateInfo,
                            unlockInfo: includeUpdateInfo,
                        },
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

type ContractRevisionTableWithRates = ContractRevisionTableWithFormData & {
    rateRevisions: RateOnContractHistory[]
}

type ContractTableWithRelations = ContractTable & {
    revisions: ContractRevisionTableWithRates[]
}

export { includeFullContract }

export type {
    ContractTableWithRelations,
    ContractRevisionTableWithRates,
    ContractTableFullPayload,
}
