import { z } from 'zod'

const documentSchema = z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string(),

    contractRevisionID: z.string().optional(),
    rateRevisionID: z.string().optional(),
})

export type DocumentType = z.infer<typeof documentSchema>
export { documentSchema }
