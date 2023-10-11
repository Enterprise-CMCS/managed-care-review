import { z } from 'zod'
import {
    rateRevisionWithContractsSchema,
    rateRevisionSchema,
} from './revisionTypes'

const rateSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    status: z.union([
        z.literal('SUBMITTED'),
        z.literal('DRAFT'),
        z.literal('UNLOCKED'),
        z.literal('RESUBMITTED'),
    ]),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    // If this rate is in a DRAFT or UNLOCKED status, there will be a draftRevision
    draftRevision: rateRevisionWithContractsSchema.optional(),
    // All revisions are submitted and in reverse chronological order
    revisions: z.array(rateRevisionWithContractsSchema),
})

const draftRateSchema = rateSchema.extend({
    status: z.literal('DRAFT'),
    revisions: z.array(rateRevisionWithContractsSchema).min(1),
})
type RateType = z.infer<typeof rateSchema>
export {
    rateRevisionSchema,
    rateRevisionWithContractsSchema,
    draftRateSchema,
    rateSchema,
}

export type { RateType }
