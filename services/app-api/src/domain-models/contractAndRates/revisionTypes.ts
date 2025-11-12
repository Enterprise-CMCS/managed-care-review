import { z } from 'zod'
import { updateInfoSchema } from './updateInfoType'
import {
    contractFormDataSchema,
    rateFormDataSchema,
    strippedRateFormDataSchema,
} from './formDataTypes'

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    contract: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
        contractSubmissionType: z.enum(['HEALTH_PLAN', 'EQRO']),
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

const strippedRateRevisionSchema = z.object({
    id: z.string().uuid(),
    rateID: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: strippedRateFormDataSchema,
})

type ContractRevisionType = z.infer<typeof contractRevisionSchema>
type RateRevisionType = z.infer<typeof rateRevisionSchema>
type StrippedRateRevisionType = z.infer<typeof strippedRateRevisionSchema>

export {
    contractRevisionSchema,
    rateRevisionSchema,
    strippedRateRevisionSchema,
}

export type { ContractRevisionType, RateRevisionType, StrippedRateRevisionType }
