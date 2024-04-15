import { z } from 'zod'
import { updateInfoSchema } from './updateInfoType'
import { contractFormDataSchema, rateFormDataSchema } from './formDataTypes'

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    contract: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: contractFormDataSchema,
})

const rateRevisionSchema = z.object({
    id: z.string().uuid(),
    rateID: z.string().uuid(),
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
