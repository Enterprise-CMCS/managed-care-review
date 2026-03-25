import { z } from 'zod'
import {
    statusSchema,
    contractReviewStatusSchema,
    consolidatedContractStatusSchema,
    consolidatedRateStatusSchema,
    rateReviewStatusSchema,
} from '../contractAndRates/statusType'
import {
    contractFormDataSchema,
    rateFormDataSchema,
} from '../contractAndRates/formDataTypes'

// Note: contractFormDataSchema extends genericContractFormDataSchema with
// optional treatment for fields that may be null in the DB. It includes
// both Health Plan and EQRO fields (unlike eqroContractFormDataSchema
// which sets Health Plan-only fields to undefined).
import { contractSubmissionTypeSchema } from '../contractAndRates/contractSubmissionType'
import { userRolesSchema } from '../UserType'

// Stripped document schema — only id and name for the flatten export
const flattenDocumentSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
})

// Stripped state contact schema — only email for the flatten export
const flattenStateContactSchema = z.object({
    email: z.string().email().optional().or(z.literal('')),
})

// Stripped actuary contact schema — only id and email for the flatten export
const flattenActuaryContactSchema = z.object({
    id: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
})

// FlattenRate flattens a rate and one of its revisions into a single
// depth-1 object. Merges rate-level, revision-level, and formData fields.
const flattenRateSchema = z.object({
    // --- Rate-level fields ---
    rateId: z.uuid(),
    rateStateCode: z.string(),
    rateStateNumber: z.number().min(1),
    parentContractID: z.uuid(),
    rateStatus: statusSchema,
    rateReviewStatus: rateReviewStatusSchema,
    rateConsolidatedStatus: consolidatedRateStatusSchema,
    rateCreatedAt: z.date(),
    rateUpdatedAt: z.date(),

    // --- Rate revision-level fields ---
    rateRevisionId: z.uuid(),
    rateRevisionCreatedAt: z.date(),
    rateRevisionUpdatedAt: z.date(),

    // --- Flattened rate submitInfo ---
    rateSubmitInfoUpdatedAt: z.date().optional(),
    rateSubmitInfoUpdatedByRole: userRolesSchema.optional(),
    rateSubmitInfoUpdatedByEmail: z.string().optional(),
    rateSubmitInfoUpdatedByGivenName: z.string().optional(),
    rateSubmitInfoUpdatedByFamilyName: z.string().optional(),
    rateSubmitInfoUpdatedReason: z.string().optional(),

    // --- Flattened rate unlockInfo ---
    rateUnlockInfoUpdatedAt: z.date().optional(),
    rateUnlockInfoUpdatedByRole: userRolesSchema.optional(),
    rateUnlockInfoUpdatedByEmail: z.string().optional(),
    rateUnlockInfoUpdatedByGivenName: z.string().optional(),
    rateUnlockInfoUpdatedByFamilyName: z.string().optional(),
    rateUnlockInfoUpdatedReason: z.string().optional(),

    // --- Rate form data fields (from rateFormDataSchema, excluding packagesWithSharedRateCerts) ---
    ...rateFormDataSchema.omit({ packagesWithSharedRateCerts: true }).shape,

    // --- Override nested fields to strip unnecessary data ---
    rateDocuments: z.array(flattenDocumentSchema).optional(),
    supportingDocuments: z.array(flattenDocumentSchema).optional(),
    certifyingActuaryContacts: z.array(flattenActuaryContactSchema).optional(),
    addtlActuaryContacts: z.array(flattenActuaryContactSchema).optional(),
})

// FlattenContract flattens a contract and one of its revisions into a single
// depth-1 object. Each revision of a contract produces one FlattenContract row.
// Fields shared between the contract and revision (stateCode, stateNumber,
// contractSubmissionType) are kept once to avoid duplication.
const flattenContractSchema = z.object({
    // --- Contract-level fields ---
    contractId: z.uuid(),
    submissionID: z.string(), //name at this revision
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    contractSubmissionType: contractSubmissionTypeSchema,
    mccrsID: z.string().optional(),
    status: statusSchema,
    reviewStatus: contractReviewStatusSchema,
    consolidatedStatus: consolidatedContractStatusSchema,
    contractCreatedAt: z.date(),
    contractUpdatedAt: z.date(),
    initiallySubmittedAt: z.date(),
    lastUpdatedForDisplay: z.date(),

    // --- Revision-level fields ---
    revisionId: z.uuid(),
    revisionCreatedAt: z.date(),
    revisionUpdatedAt: z.date(),

    // --- Flattened submitInfo (UpdateInfoType) ---
    submitInfoUpdatedAt: z.date().optional(),
    submitInfoUpdatedByRole: userRolesSchema.optional(),
    submitInfoUpdatedByEmail: z.string().optional(),
    submitInfoUpdatedByGivenName: z.string().optional(),
    submitInfoUpdatedByFamilyName: z.string().optional(),
    submitInfoUpdatedReason: z.string().optional(),

    // --- Flattened unlockInfo (UpdateInfoType) ---
    unlockInfoUpdatedAt: z.date().optional(),
    unlockInfoUpdatedByRole: userRolesSchema.optional(),
    unlockInfoUpdatedByEmail: z.string().optional(),
    unlockInfoUpdatedByGivenName: z.string().optional(),
    unlockInfoUpdatedByFamilyName: z.string().optional(),
    unlockInfoUpdatedReason: z.string().optional(),

    // --- Form data fields (from contractFormDataSchema, includes both Health Plan and EQRO fields) ---
    ...contractFormDataSchema.shape,

    // --- Override nested fields to strip unnecessary data ---
    contractDocuments: z.array(flattenDocumentSchema),
    supportingDocuments: z.array(flattenDocumentSchema),
    stateContacts: z.array(flattenStateContactSchema),

    // --- Associated rate revisions ---
    rateRevisions: z.array(flattenRateSchema),
})

const flattenContractsSchema = z.array(flattenContractSchema)

type FlattenRateType = z.infer<typeof flattenRateSchema>
type FlattenContractType = z.infer<typeof flattenContractSchema>
type FlattenContractsType = z.infer<typeof flattenContractsSchema>

export { flattenRateSchema, flattenContractSchema, flattenContractsSchema }
export type { FlattenRateType, FlattenContractType, FlattenContractsType }
