import { z } from 'zod'
import { stateContactSchema } from './formDataTypes'

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
    stateContacts: z.array(stateContactSchema).default([]),
})

const createSDPSchema = sdpFormDataSchema.extend({
    stateCode: z.string(),
})

const sdpDocumentInputSchema = z.object({
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string(),
    dateAdded: z.date().optional(),
    downloadURL: z.string().optional(),
    s3BucketName: z.string().optional(),
    s3Key: z.string().optional(),
})

const updateSDPSchema = z.object({
    sdpID: z.string().uuid(),
    stateCode: z.string(),
    lastSeenUpdatedAt: z.date(),
    submissionType: sdpSubmissionTypeSchema.optional(),
    programIDs: z.array(z.string()).optional(),
    changesIncluded: z.array(sdpChangeTypeSchema).optional(),
    ratingPeriodStart: z.date().optional(),
    ratingPeriodEnd: z.date().optional(),
    estimatedFederalShare: z.string().optional(),
    estimatedStateShare: z.string().optional(),
    automaticallyRenewed: z.boolean().optional(),
    sdpDocuments: z.array(sdpDocumentInputSchema),
    relatedContractIDs: z.array(z.string().uuid()),
    stateContacts: z.array(stateContactSchema).default([]),
})

const submitSDPSchema = z.object({
    sdpID: z.string().uuid(),
    stateCode: z.string(),
    lastSeenUpdatedAt: z.date(),
})

const unlockSDPSchema = z.object({
    sdpID: z.string().uuid(),
    unlockedByUserID: z.string().uuid(),
    unlockReason: z.string(),
})

type SDPFormDataType = z.infer<typeof sdpFormDataSchema>
type CreateSDPInputType = z.infer<typeof createSDPSchema>
type SDPDocumentInputType = z.infer<typeof sdpDocumentInputSchema>
type UpdateSDPInputType = z.infer<typeof updateSDPSchema>
type SubmitSDPInputType = z.infer<typeof submitSDPSchema>
type UnlockSDPInputType = z.infer<typeof unlockSDPSchema>
type SDPSubmissionType = z.infer<typeof sdpSubmissionTypeSchema>
type SDPChangeType = z.infer<typeof sdpChangeTypeSchema>

export {
    sdpFormDataSchema,
    createSDPSchema,
    sdpDocumentInputSchema,
    updateSDPSchema,
    submitSDPSchema,
    unlockSDPSchema,
    sdpSubmissionTypeSchema,
    sdpChangeTypeSchema,
}
export type {
    SDPFormDataType,
    CreateSDPInputType,
    SDPDocumentInputType,
    UpdateSDPInputType,
    SubmitSDPInputType,
    UnlockSDPInputType,
    SDPSubmissionType,
    SDPChangeType,
}
