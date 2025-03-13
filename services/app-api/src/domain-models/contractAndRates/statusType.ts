import { z } from 'zod'

const statusSchema = z.union([
    z.literal('SUBMITTED'),
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
    z.literal('RESUBMITTED'),
])

const contractReviewStatusSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('APPROVED'),
    z.literal('WITHDRAWN'),
])

const rateReviewStatusSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('WITHDRAWN'),
])

const consolidatedContractStatusSchema = z.union([
    ...statusSchema.options,
    z.literal('APPROVED'),
    z.literal('WITHDRAWN'),
])

const consolidatedRateStatusSchema = z.union([
    ...statusSchema.options,
    z.literal('WITHDRAWN'),
])

const unlockedContractStatusSchema = z.union([
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
])

type ConsolidatedContractStatusType = z.infer<
    typeof consolidatedContractStatusSchema
>

type ConsolidatedRateStatusType = z.infer<typeof consolidatedRateStatusSchema>

export type { ConsolidatedContractStatusType, ConsolidatedRateStatusType }
export {
    statusSchema,
    unlockedContractStatusSchema,
    contractReviewStatusSchema,
    consolidatedContractStatusSchema,
    consolidatedRateStatusSchema,
    rateReviewStatusSchema,
}
