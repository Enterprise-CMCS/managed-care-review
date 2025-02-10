import { z } from 'zod'
import * as v from "@badrap/valita";

import type { contractSchema } from './contractTypes'
import { baseUserSchema, valitaBaseUserSchema } from '../UserType'

const contractReviewActionTypeSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('MARK_AS_APPROVED'),
])

const valitaContractReviewActionTypeSchema = v.union(
    v.literal('UNDER_REVIEW'),
    v.literal('MARK_AS_APPROVED'),
)

const contractReviewActionSchema = z.object({
    updatedAt: z.date(),
    updatedBy: baseUserSchema.omit({ id: true }),
    updatedReason: z.string().optional(),
    dateApprovalReleasedToState: z.date().optional(),
    actionType: contractReviewActionTypeSchema,
    contractID: z.string(),
})

const valitaContractReviewActionSchema = v.object({
    updatedAt: v.string(), // date not supported
    updatedBy: valitaBaseUserSchema, // omitting id not supported
    updatedReason: v.string().optional(),
    dateApprovalReleasedToState: v.string().optional(), // date not supported
    actionType: valitaContractReviewActionTypeSchema,
    contractID: v.string(),
})

type ContractReviewActionType = z.infer<typeof contractReviewActionSchema>
type PackageStatusType = z.infer<typeof contractSchema.shape.status>

export type { PackageStatusType, ContractReviewActionType }

export { contractReviewActionSchema, valitaContractReviewActionSchema }
