import { z } from 'zod'

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
])

export type AuditDocument = z.infer<typeof auditDocumentSchema>

export { auditDocumentSchema }
