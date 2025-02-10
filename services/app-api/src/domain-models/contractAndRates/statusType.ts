import { z } from 'zod'
import * as v from "@badrap/valita";

const statusSchema = z.union([
    z.literal('SUBMITTED'),
    z.literal('DRAFT'),
    z.literal('UNLOCKED'),
    z.literal('RESUBMITTED'),
])

const valitaStatusSchema = v.union(
    v.literal('SUBMITTED'),
    v.literal('DRAFT'),
    v.literal('UNLOCKED'),
    v.literal('RESUBMITTED'),
)

const contractReviewStatusSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('APPROVED'),
])

const valitaContractReviewStatusSchema = v.union(
    v.literal('UNDER_REVIEW'),
    v.literal('APPROVED'),
)

const rateReviewStatusSchema = z.union([
    z.literal('UNDER_REVIEW'),
    z.literal('WITHDRAWN'),
])

const consolidatedContractStatusSchema = z.union([
    ...statusSchema.options,
    z.literal('APPROVED'),
])

const valitaConsolidatedContractStatusSchema = v.union(
    // ...valitaStatusSchema.options, //Property 'options' does not exist on
    v.literal('SUBMITTED'),
    v.literal('DRAFT'),
    v.literal('UNLOCKED'),
    v.literal('RESUBMITTED'),
    v.literal('APPROVED'),
)

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
    valitaStatusSchema,
    unlockedContractStatusSchema,
    contractReviewStatusSchema,
    valitaContractReviewStatusSchema,
    consolidatedContractStatusSchema,
    valitaConsolidatedContractStatusSchema,
    consolidatedRateStatusSchema,
    rateReviewStatusSchema,
}
