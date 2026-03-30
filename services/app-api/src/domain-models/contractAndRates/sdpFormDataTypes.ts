import { z } from 'zod'

const sdpSubmissionTypeSchema = z.union([
    z.literal('NEW_STATE_DIRECTED_PAYMENT_PREPRINT'),
    z.literal('AMENDMENT_TO_AN_APPROVED_PREPRINT'),
    z.literal('RENEWAL_FOR_NEW_RATING_PERIOD'),
])

const sdpChangeTypeSchema = z.union([
    z.literal('RATING_PERIOD'),
    z.literal('PAYMENT_TYPE'),
    z.literal('PROVIDER_TYPE'),
    z.literal('QUALITY_METRICS_OR_BENCHMARKS'),
    z.literal('OTHER'),
])

const sdpFormDataSchema = z.object({
    submissionType: sdpSubmissionTypeSchema,
    programIDs: z.array(z.string()).min(1),
    changesIncluded: z.array(sdpChangeTypeSchema).min(1),
    ratingPeriodStart: z.date(),
    ratingPeriodEnd: z.date(),
    estimatedFederalShare: z.string().optional(),
    estimatedStateShare: z.string().optional(),
    automaticallyRenewed: z.boolean(),
})

const createSDPSchema = sdpFormDataSchema.extend({
    stateCode: z.string(),
})

type SDPFormDataType = z.infer<typeof sdpFormDataSchema>
type CreateSDPInputType = z.infer<typeof createSDPSchema>
type SDPSubmissionType = z.infer<typeof sdpSubmissionTypeSchema>
type SDPChangeType = z.infer<typeof sdpChangeTypeSchema>

export {
    sdpFormDataSchema,
    createSDPSchema,
    sdpSubmissionTypeSchema,
    sdpChangeTypeSchema,
}
export type {
    SDPFormDataType,
    CreateSDPInputType,
    SDPSubmissionType,
    SDPChangeType,
}
