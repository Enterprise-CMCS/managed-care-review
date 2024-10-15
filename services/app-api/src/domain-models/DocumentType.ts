import { z } from 'zod'

const baseDocumentSchema = z.object({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    name: z.string(),
    s3URL: z.string(),
})

const contractDocumentSchema = baseDocumentSchema.extend({
    type: z.literal('contractDocument'),
    contractRevisionID: z.string(),
    sha256: z.string(),
})

const rateDocumentSchema = baseDocumentSchema.extend({
    type: z.literal('rateDocument'),
    rateRevisionID: z.string(),
    sha256: z.string(),
})

const auditDocumentSchema = z.union([
    contractDocumentSchema,
    rateDocumentSchema,
])

export type AuditDocument = z.infer<typeof auditDocumentSchema>

export { auditDocumentSchema }
