import { z } from 'zod'

export const DocumentZipTypeEnum = z.enum([
    'CONTRACT_DOCUMENTS',
    'RATE_DOCUMENTS',
])

export type DocumentZipType = z.infer<typeof DocumentZipTypeEnum>

export const DocumentZipPackageSchema = z.object({
    id: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    s3URL: z.string(),
    sha256: z.string(),
    s3BucketName: z.string().nullable(),
    s3Key: z.string().nullable(),
    contractRevisionID: z.string().nullable(),
    rateRevisionID: z.string().nullable(),
    documentType: DocumentZipTypeEnum,
})

export type DocumentZipPackageType = z.infer<typeof DocumentZipPackageSchema>

export const CreateDocumentZipPackageSchema = z.object({
    s3URL: z.string(),
    sha256: z.string(),
    s3BucketName: z.string(),
    s3Key: z.string(),
    contractRevisionID: z.string().nullable().optional(),
    rateRevisionID: z.string().nullable().optional(),
    documentType: DocumentZipTypeEnum,
})

export type CreateDocumentZipPackageType = z.infer<
    typeof CreateDocumentZipPackageSchema
>
