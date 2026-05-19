import { z } from 'zod'
import { baseUserSchema } from '../UserType'
import { contractTypeSchema, preprocessNulls } from './formDataTypes'

// Override on a single contract document for a submitted contract revision.
// documentID null = add a new doc (payload fields must be populated).
// documentID non-null = update an existing doc (only dateAdded overrideable today).
// Sparse-patch convention: null on a payload field means "no override for this field".
const contractDocumentOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    documentID: preprocessNulls(z.uuid().nullable().optional()),

    // Add-path payload (set only when documentID is null).
    name: preprocessNulls(z.string().nullable().optional()),
    sha256: preprocessNulls(z.string().nullable().optional()),
    s3URL: preprocessNulls(z.string().nullable().optional()),
    s3BucketName: preprocessNulls(z.string().nullable().optional()),
    s3Key: preprocessNulls(z.string().nullable().optional()),

    // Overrideable in both add and update paths.
    dateAdded: preprocessNulls(z.date().nullable().optional()),
})

const contractRevisionOverrideDataFragmentSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    contractRevisionID: z.uuid(),
    contractType: preprocessNulls(contractTypeSchema.optional()),
    contractDocuments: preprocessNulls(
        z.array(contractDocumentOverrideSchema).optional()
    ),
    supportingDocuments: preprocessNulls(
        z.array(contractDocumentOverrideSchema).optional()
    ),
})

const contractOverrideDataFragmentSchema = z.object({
    initiallySubmittedAt: preprocessNulls(z.date().optional()),
    revisionOverride: preprocessNulls(
        contractRevisionOverrideDataFragmentSchema.optional()
    ),
})

const contractDataOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedBy: baseUserSchema.optional(),
    description: z.string(),
    overrides: contractOverrideDataFragmentSchema,
})

type ContractDataOverrideType = z.infer<typeof contractDataOverrideSchema>

const genericDocumentOverrideSchema = z.object({
    id: z.uuid(),
    dateAdded: preprocessNulls(z.date().nullable().optional()),
    documentID: z.uuid(),
})

const rateRevisionOverrideDataFragmentSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    rateRevisionID: z.uuid(),
    rateDocuments: preprocessNulls(
        z.array(genericDocumentOverrideSchema).optional()
    ),
    supportingDocuments: preprocessNulls(
        z.array(genericDocumentOverrideSchema).optional()
    ),
})

const rateOverrideDataFragmentSchema = z.object({
    initiallySubmittedAt: preprocessNulls(z.date().optional()),
    revisionOverride: preprocessNulls(
        rateRevisionOverrideDataFragmentSchema.optional()
    ),
})

const rateDataOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedBy: baseUserSchema.optional(),
    description: z.string(),
    overrides: rateOverrideDataFragmentSchema,
})

type RateDataOverrideType = z.infer<typeof rateDataOverrideSchema>

type GenericOverrideDocumentType = z.infer<typeof genericDocumentOverrideSchema>

type ContractDocumentOverrideType = z.infer<
    typeof contractDocumentOverrideSchema
>

export {
    contractDataOverrideSchema,
    rateDataOverrideSchema,
    contractOverrideDataFragmentSchema,
    rateOverrideDataFragmentSchema,
    contractDocumentOverrideSchema,
}
export type {
    ContractDataOverrideType,
    RateDataOverrideType,
    GenericOverrideDocumentType,
    ContractDocumentOverrideType,
}
