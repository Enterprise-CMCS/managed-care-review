import { z } from 'zod'
import { baseUserSchema } from '../UserType'
import { contractTypeSchema, preprocessNulls } from './formDataTypes'

const contractRevisionOverrideDataFragmentSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    contractRevisionID: z.uuid(),
    contractType: preprocessNulls(contractTypeSchema.optional()),
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

export {
    contractDataOverrideSchema,
    rateDataOverrideSchema,
    contractOverrideDataFragmentSchema,
    rateOverrideDataFragmentSchema,
}
export type {
    ContractDataOverrideType,
    RateDataOverrideType,
    GenericOverrideDocumentType,
}
