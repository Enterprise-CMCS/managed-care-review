import { z } from 'zod'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
} from './baseContractRateTypes'
import { rateRevisionSchema } from './revisionTypes'

const rateSchema = rateWithoutDraftContractsSchema.extend({
    draftContracts: z.array(contractWithoutDraftRatesSchema).optional(),
})

type RateType = z.infer<typeof rateSchema>

export { rateRevisionSchema, rateSchema }

export type { RateType }
