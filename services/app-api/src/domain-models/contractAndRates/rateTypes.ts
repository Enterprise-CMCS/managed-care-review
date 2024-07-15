import { z } from 'zod'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
} from './baseContractRateTypes'
import {
    rateRevisionWithContractsSchema,
    rateRevisionSchema,
} from './revisionTypes'

const baseCategorySchema = z.object({
    name: z.string(),
})

type Category = z.infer<typeof baseCategorySchema> & {
    subcategories: Category[]
}

const categorySchema: z.ZodType<Category> = baseCategorySchema.extend({
    subcategories: z.lazy(() => categorySchema.array()),
})

const rateSchema = rateWithoutDraftContractsSchema.extend({
    draftContracts: z.array(contractWithoutDraftRatesSchema).optional(),
})

type RateType = z.infer<typeof rateSchema>

export { rateRevisionSchema, rateRevisionWithContractsSchema, rateSchema }

export type { RateType }
