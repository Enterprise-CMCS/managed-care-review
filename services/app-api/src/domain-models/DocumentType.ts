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
const auditDocumentSchema = z.union([
    contractDocumentSchema.extend({ type: z.literal('contract') }),
    rateDocumentSchema.extend({ type: z.literal('rate') }),
])

export type AuditDocument = z.infer<typeof auditDocumentSchema>

export { auditDocumentSchema }
