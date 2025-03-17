import { z } from 'zod'
import type { contractSchema } from './contractTypes'
import { baseUserSchema } from '../UserType'

const contractReviewActionTypeSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('MARK_AS_APPROVED'),
    z.literal('WITHDRAW'),
])

const contractReviewActionSchema = z.object({
    updatedAt: z.date(),
    updatedBy: baseUserSchema.omit({ id: true }),
    updatedReason: z.string().optional(),
    dateApprovalReleasedToState: z.date().optional(),
    actionType: contractReviewActionTypeSchema,
    contractID: z.string(),
})

type ContractReviewActionType = z.infer<typeof contractReviewActionSchema>
type PackageStatusType = z.infer<typeof contractSchema.shape.status>

export type { PackageStatusType, ContractReviewActionType }

export { contractReviewActionSchema }
