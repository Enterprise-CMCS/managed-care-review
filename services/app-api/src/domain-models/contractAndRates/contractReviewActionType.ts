import { z } from 'zod'
import type { contractSchema } from './contractTypes'
import { baseUserSchema } from '../UserType'

const contractReviewActionTypeSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('APPROVAL_NOTICE'),
    z.literal('WITHDRAWN'),
])

const contractReviewActionSchema = z.object({
    updatedAt: z.date(),
    updatedBy: baseUserSchema.omit({ id: true }),
    updatedReason: z.string(),
    actionType: contractReviewActionTypeSchema,
    contractID: z.string(),
})

type UpdateInfoType = z.infer<typeof contractReviewActionSchema>
type PackageStatusType = z.infer<typeof contractSchema.shape.status>

export type { PackageStatusType, UpdateInfoType }

export { contractReviewActionSchema }
