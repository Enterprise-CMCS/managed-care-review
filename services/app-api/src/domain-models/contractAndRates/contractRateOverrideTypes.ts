import { z } from 'zod'
import { baseUserSchema } from '../UserType'
import { contractTypeSchema, preprocessNulls } from './formDataTypes'

const scalarFieldOverrideOperationSchema = z.enum([
    'OVERRIDE',
    'CLEAR_OVERRIDE',
])

const arrayFieldOverrideOperationSchema = z.enum(['OVERRIDE', 'ADD', 'DELETE'])

// Override on a single document item for a submitted contract/rate revision.
// documentOp is the item-level array operation. Field-level intent is carried
// by scalar op/value pairs such as dateAddedOp/dateAdded.
const genericDocumentOverrideSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    documentOp: arrayFieldOverrideOperationSchema,
    documentSha256: z.string(),
    documentID: preprocessNulls(z.uuid().nullable().optional()),

    // Add-path payload (set only when documentOp is ADD).
    name: preprocessNulls(z.string().nullable().optional()),
    sha256: preprocessNulls(z.string().nullable().optional()),
    s3URL: preprocessNulls(z.string().nullable().optional()),
    s3BucketName: preprocessNulls(z.string().nullable().optional()),
    s3Key: preprocessNulls(z.string().nullable().optional()),

    // Overrideable in both add and update paths.
    dateAdded: preprocessNulls(z.date().nullable().optional()),
    dateAddedOp: preprocessNulls(
        scalarFieldOverrideOperationSchema.nullable().optional()
    ),
})

const contractDocumentOverrideSchema = genericDocumentOverrideSchema

const contractRevisionOverrideDataFragmentSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    contractRevisionID: z.uuid(),
    contractType: preprocessNulls(contractTypeSchema.optional()),
    contractTypeOp: preprocessNulls(
        scalarFieldOverrideOperationSchema.nullable().optional()
    ),
    contractDocuments: preprocessNulls(
        z.array(contractDocumentOverrideSchema).optional()
    ),
    supportingDocuments: preprocessNulls(
        z.array(contractDocumentOverrideSchema).optional()
    ),
})

const contractOverrideDataFragmentSchema = z.object({
    initiallySubmittedAt: preprocessNulls(z.date().optional()),
    initiallySubmittedAtOp: preprocessNulls(
        scalarFieldOverrideOperationSchema.nullable().optional()
    ),
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
    initiallySubmittedAtOp: preprocessNulls(
        scalarFieldOverrideOperationSchema.nullable().optional()
    ),
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
    scalarFieldOverrideOperationSchema,
    arrayFieldOverrideOperationSchema,
}
export type {
    ContractDataOverrideType,
    RateDataOverrideType,
    GenericOverrideDocumentType,
    ContractDocumentOverrideType,
}
