import { z } from 'zod'

const contractRevisionTableSchema = z.object({
    id: z.string(),
    contractID: z.string(),
})

const rateRevisionTableSchema = z.object({
    id: z.string(),
    rateID: z.string(),
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
    contractRevision: contractRevisionTableSchema.optional(),
})

const rateDocumentSchema = baseDocumentSchema.extend({
    rateRevisionID: z.string(),
    sha256: z.string(),
    rateRevision: rateRevisionTableSchema.optional(),
})

const contractSupportingDocumentSchema = baseDocumentSchema.extend({
    contractRevisionID: z.string(),
    sha256: z.string(),
    contractRevision: contractRevisionTableSchema.optional(),
})

const rateSupportingDocumentSchema = baseDocumentSchema.extend({
    rateRevisionID: z.string(),
    sha256: z.string(),
    rateRevision: rateRevisionTableSchema.optional(),
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

export { auditDocumentSchema }
