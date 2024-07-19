import { z } from 'zod'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
} from './baseContractRateTypes'
import {
    rateRevisionWithContractsSchema,
    rateRevisionSchema,
} from './revisionTypes'

const rateSchema = rateWithoutDraftContractsSchema.extend({
    draftContracts: z.array(contractWithoutDraftRatesSchema).optional(),
})

type RateType = z.infer<typeof rateSchema>

export { rateRevisionSchema, rateRevisionWithContractsSchema, rateSchema }

export type { RateType }
