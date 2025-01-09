import { z } from 'zod'
import { baseUserSchema } from '../UserType'

const rateReviewActionTypeSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('WITHDRAW'),
])

const rateReviewActionSchema = z.object({
    updatedAt: z.date(),
    updatedBy: baseUserSchema.omit({ id: true }),
    updatedReason: z.string(),
    actionType: rateReviewActionTypeSchema,
    rateID: z.string(),
})

type RateReviewActionType = z.infer<typeof rateReviewActionTypeSchema>
type RateReviewType = z.infer<typeof rateReviewActionSchema>

export type { RateReviewActionType, RateReviewType }
export { rateReviewActionSchema }
