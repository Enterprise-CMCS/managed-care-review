import { ContractTable } from '@prisma/client'
import {
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
