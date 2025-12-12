import { z } from 'zod'
import { updateInfoSchema } from './updateInfoType'
import {
    contractFormDataSchema,
    eqroContractFormDataSchema,
    rateFormDataSchema,
    strippedRateFormDataSchema,
} from './formDataTypes'
import { contractSubmissionTypeSchema } from './contractSubmissionType'

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    contract: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
        contractSubmissionType: contractSubmissionTypeSchema,
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: contractFormDataSchema,
})

const eqroContractRevisionSchema = z.object({
    id: z.string().uuid(),
    contract: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
        contractSubmissionType: z.literal('EQRO'),
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: eqroContractFormDataSchema,
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
    eqroContractRevisionSchema,
}

export type { ContractRevisionType, RateRevisionType, StrippedRateRevisionType }
