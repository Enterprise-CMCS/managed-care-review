import { z } from 'zod'
import { baseUserSchema } from '../UserType'
import { preprocessNulls } from './formDataTypes'

const contractOverrideDataFragmentSchema = z.object({
    initiallySubmittedAt: preprocessNulls(z.date().optional()),
})

const contractDataOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedBy: baseUserSchema.optional(),
    description: z.string(),
    overrides: contractOverrideDataFragmentSchema,
})

type ContractDataOverrideType = z.infer<typeof contractDataOverrideSchema>

const rateOverrideDataFragmentSchema = z.object({
    initiallySubmittedAt: preprocessNulls(z.date().optional()),
})

const rateDataOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedBy: baseUserSchema.optional(),
    description: z.string(),
    overrides: rateOverrideDataFragmentSchema,
})

type RateDataOverrideType = z.infer<typeof rateDataOverrideSchema>

export {
    contractDataOverrideSchema,
    rateDataOverrideSchema,
    contractOverrideDataFragmentSchema,
    rateOverrideDataFragmentSchema,
}
export type { ContractDataOverrideType, RateDataOverrideType }
