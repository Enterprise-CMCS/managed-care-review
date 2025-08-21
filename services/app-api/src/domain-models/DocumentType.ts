import { z } from 'zod'

const sharedDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string().optional(),
    downloadURL: z.string().optional(),
})

const baseDocumentSchema = z.object({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    name: z.string(),
    s3URL: z.string(),
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

const auditDocumentSchema = z.union([
    contractDocumentSchema.extend({ type: z.literal('contractDoc') }),
    rateDocumentSchema.extend({ type: z.literal('rateDoc') }),
    contractSupportingDocumentSchema.extend({
        type: z.literal('contractSupportingDoc'),
    }),
    rateSupportingDocumentSchema.extend({
        type: z.literal('rateSupportingDoc'),
    }),

    contractQuestionDocumentSchema.extend({
        type: z.literal('contractQuestionDoc'),
    }),

    contractQuestionResponseDocumentSchema.extend({
        type: z.literal('contractQuestionResponseDoc'),
    }),
    rateQuestionDocumentSchema.extend({
        type: z.literal('rateQuestionDoc'),
    }),
    rateQuestionResponseDocumentSchema.extend({
        type: z.literal('rateQuestionResponseDoc'),
    }),
])

export type AuditDocument = z.infer<typeof auditDocumentSchema>
export type SharedDocument = z.infer<typeof sharedDocumentSchema>
export type DocumentTypes = z.infer<typeof documentTypesSchema>

export { auditDocumentSchema, sharedDocumentSchema, documentTypesSchema }
