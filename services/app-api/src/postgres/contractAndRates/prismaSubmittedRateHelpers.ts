import { RateTable } from '@prisma/client'
import {
    RateRevisionTableWithFormData,
    RateOnContractHistory
} from './prismaSharedContractRateHelpers'

type RateRevisionTableWithContracts = RateRevisionTableWithFormData & {
    contractRevisions: RateOnContractHistory[]
}

type RateTableWithRelations = RateTable & {
    revisions: RateRevisionTableWithContracts[]
}

export type { RateTableWithRelations, RateRevisionTableWithContracts }
