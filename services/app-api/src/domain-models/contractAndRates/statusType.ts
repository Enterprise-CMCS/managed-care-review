import { z } from 'zod'

const statusSchema = z.union([
    z.literal('SUBMITTED'),
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
    z.literal('RESUBMITTED'),
])

const reviewStatusSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('APPROVED'),
])

const consolidatedContractStatusSchema = z.union([
    z.literal('SUBMITTED'),
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
    z.literal('RESUBMITTED'),
    z.literal('APPROVED'),
])

const unlockedContractStatusSchema = z.union([
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
])
type ConsolidatedContractStatusType = z.infer<
    typeof consolidatedContractStatusSchema
>
export type { ConsolidatedContractStatusType }
export {
    statusSchema,
    unlockedContractStatusSchema,
    reviewStatusSchema,
    consolidatedContractStatusSchema,
}
