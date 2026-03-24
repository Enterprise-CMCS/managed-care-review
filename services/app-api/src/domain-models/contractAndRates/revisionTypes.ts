import { z } from 'zod'
import { updateInfoSchema } from './updateInfoType'
import {
    contractFormDataSchema,
    eqroContractFormDataSchema,
    rateFormDataSchema,
    strippedRateFormDataSchema,
    strippedContractFormDataSchema,
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
    id: z.uuid(),
    rateID: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: strippedRateFormDataSchema,
})

const strippedContractRevisionSchema = z.object({
    id: z.uuid(),
    contract: z.object({
        id: z.uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
        contractSubmissionType: contractSubmissionTypeSchema,
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: strippedContractFormDataSchema,
})

type ContractRevisionType = z.infer<typeof contractRevisionSchema>
type RateRevisionType = z.infer<typeof rateRevisionSchema>
type StrippedRateRevisionType = z.infer<typeof strippedRateRevisionSchema>
type StrippedContractRevisionType = z.infer<
    typeof strippedContractRevisionSchema
>

export {
    contractRevisionSchema,
    rateRevisionSchema,
    strippedRateRevisionSchema,
    strippedContractRevisionSchema,
    eqroContractRevisionSchema,
}

export type {
    ContractRevisionType,
    RateRevisionType,
    StrippedRateRevisionType,
    StrippedContractRevisionType,
}
