import { z } from 'zod'
import { baseUserSchema } from '../UserType'

const contractDataOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedBy: baseUserSchema.optional(),
    description: z.string(),
    overrides: z.object({
        initiallySubmittedAt: z.date().optional(),
    }),
})

type ContractDataOverrideType = z.infer<typeof contractDataOverrideSchema>

const rateDataOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedBy: baseUserSchema.optional(),
    description: z.string(),
    overrides: z.object({
        initiallySubmittedAt: z.date().optional(),
    }),
})

type RateDataOverrideType = z.infer<typeof rateDataOverrideSchema>

export { contractDataOverrideSchema, rateDataOverrideSchema }
export type { ContractDataOverrideType, RateDataOverrideType }
