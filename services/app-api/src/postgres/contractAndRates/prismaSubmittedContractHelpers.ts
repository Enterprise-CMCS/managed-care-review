import type { ContractTable } from '@prisma/client'
import type {
    ContractRevisionTableWithFormData,
    RateOnContractHistory,
} from './prismaSharedContractRateHelpers'

type ContractRevisionTableWithRates = ContractRevisionTableWithFormData & {
    rateRevisions: RateOnContractHistory[]
}

type ContractTableWithRelations = ContractTable & {
    revisions: ContractRevisionTableWithRates[]
}

export type { ContractTableWithRelations, ContractRevisionTableWithRates }
