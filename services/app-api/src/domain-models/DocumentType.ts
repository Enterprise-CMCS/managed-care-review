import { z } from 'zod'

const baseDocumentSchema = z.object({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    name: z.string(),
    s3URL: z.string(),
    s3BucketName: z.string().nullable().optional(),
    s3Key: z.string().nullable().optional(),
})

const sharedDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string().optional(),
    downloadURL: z.string().optional(),
    s3BucketName: z.string().nullable().optional(),
    s3Key: z.string().nullable().optional(),
})

const contractDocumentSchema = baseDocumentSchema.extend({
    contractRevisionID: z.string(),
    sha256: z.string(),
})

const rateDocumentSchema = baseDocumentSchema.extend({
    rateRevisionID: z.string(),
    sha256: z.string(),
})

const contractSupportingDocumentSchema = baseDocumentSchema.extend({
    contractRevisionID: z.string(),
    sha256: z.string(),
})

const rateSupportingDocumentSchema = baseDocumentSchema.extend({
    rateRevisionID: z.string(),
    sha256: z.string(),
})

const contractQuestionDocumentSchema = baseDocumentSchema.extend({
    questionID: z.string(),
})

const contractQuestionResponseDocumentSchema = baseDocumentSchema.extend({
    responseID: z.string(),
})

const rateQuestionDocumentSchema = baseDocumentSchema.extend({
    questionID: z.string(),
})

const rateQuestionResponseDocumentSchema = baseDocumentSchema.extend({
    responseID: z.string(),
})

const auditDocumentSchema = z.union([
    contractDocumentSchema.extend({ type: z.literal('CONTRACT_DOC') }),
    rateDocumentSchema.extend({ type: z.literal('RATE_DOC') }),
    contractSupportingDocumentSchema.extend({
        type: z.literal('CONTRACT_SUPPORTING_DOC'),
    }),
    rateSupportingDocumentSchema.extend({
        type: z.literal('RATE_SUPPORTING_DOC'),
    }),

    contractQuestionDocumentSchema.extend({
        type: z.literal('CONTRACT_QUESTION_DOC'),
    }),

    contractQuestionResponseDocumentSchema.extend({
        type: z.literal('CONTRACT_QUESTION_RESPONSE_DOC'),
    }),
    rateQuestionDocumentSchema.extend({
        type: z.literal('RATE_QUESTION_DOC'),
    }),
    rateQuestionResponseDocumentSchema.extend({
        type: z.literal('RATE_QUESTION_RESPONSE_DOC'),
    }),
])

const documentTypesSchema = z.union([
    z.literal('CONTRACT_DOC'),
    z.literal('CONTRACT_SUPPORTING_DOC'),
    z.literal('RATE_DOC'),
    z.literal('RATE_SUPPORTING_DOC'),
    z.literal('CONTRACT_QUESTION_DOC'),
    z.literal('CONTRACT_QUESTION_RESPONSE_DOC'),
    z.literal('RATE_QUESTION_DOC'),
    z.literal('RATE_QUESTION_RESPONSE_DOC'),
])

export type AuditDocument = z.infer<typeof auditDocumentSchema>
export type SharedDocument = z.infer<typeof sharedDocumentSchema>
export type DocumentTypes = z.infer<typeof documentTypesSchema>

export { auditDocumentSchema, sharedDocumentSchema, documentTypesSchema }
