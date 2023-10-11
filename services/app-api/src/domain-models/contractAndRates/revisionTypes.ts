import { z } from 'zod'
import { updateInfoSchema } from './updateInfoType'
import { contractFormDataSchema, rateFormDataSchema } from './formDataTypes'

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    // contractID: z.string(),  // TODO we have this data in prisma but we lose it in the domain type - its needed for frontend which uses parent ids for routing
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: contractFormDataSchema,
})

const rateRevisionSchema = z.object({
    id: z.string().uuid(),
    // rateID: z.string(), // TODO we have this data in prisma but we lose it in the domain type - its needed for frontend which uses parent ids for routing
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: rateFormDataSchema,
})

const rateRevisionWithContractsSchema = rateRevisionSchema.extend({
    contractRevisions: z.array(contractRevisionSchema),
})

const contractRevisionWithRatesSchema = contractRevisionSchema.extend({
    rateRevisions: z.array(rateRevisionSchema),
})

type ContractRevisionType = z.infer<typeof contractRevisionSchema>
type RateRevisionType = z.infer<typeof rateRevisionSchema>
type RateRevisionWithContractsType = z.infer<
    typeof rateRevisionWithContractsSchema
>
type ContractRevisionWithRatesType = z.infer<
    typeof contractRevisionWithRatesSchema
>

export {
    rateRevisionWithContractsSchema,
    contractRevisionWithRatesSchema,
    contractRevisionSchema,
    rateRevisionSchema,
}

export type {
    ContractRevisionType,
    RateRevisionType,
    RateRevisionWithContractsType,
    ContractRevisionWithRatesType,
}
