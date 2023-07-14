import { z } from 'zod'
import {
    contractExecutionStatusSchema,
    contractTypeSchema,
    federalAuthoritySchema,
    populationCoveredSchema,
    stateContactSchema,
    submissionDocumentSchema,
    submissionTypeSchema,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto/zodSchemas'

const contractFormDataSchema = z.object({
    programIDs: z.array(z.string()),
    populationCovered: populationCoveredSchema.optional(),
    submissionType: submissionTypeSchema,
    riskBasedContract: z.boolean().optional(),
    submissionDescription: z.string(),
    stateContacts: z.array(stateContactSchema),
    supportingDocuments: z.array(submissionDocumentSchema),
    contractType: contractTypeSchema,
    contractExecutionStatus: contractExecutionStatusSchema.optional(),
    contractDocuments: z.array(submissionDocumentSchema),
    contractDateStart: z.date().optional(),
    contractDateEnd: z.date().optional(),
    managedCareEntities: z.array(z.string()),
    federalAuthorities: z.array(federalAuthoritySchema),
    inLieuServicesAndSettings: z.boolean().optional(),
    modifiedBenefitsProvided: z.boolean().optional(),
    modifiedGeoAreaServed: z.boolean().optional(),
    modifiedMedicaidBeneficiaries: z.boolean().optional(),
    modifiedRiskSharingStrategy: z.boolean().optional(),
    modifiedIncentiveArrangements: z.boolean().optional(),
    modifiedWitholdAgreements: z.boolean().optional(),
    modifiedStateDirectedPayments: z.boolean().optional(),
    modifiedPassThroughPayments: z.boolean().optional(),
    modifiedPaymentsForMentalDiseaseInstitutions: z.boolean().optional(),
    modifiedMedicalLossRatioStandards: z.boolean().optional(),
    modifiedOtherFinancialPaymentIncentive: z.boolean().optional(),
    modifiedEnrollmentProcess: z.boolean().optional(),
    modifiedGrevienceAndAppeal: z.boolean().optional(),
    modifiedNetworkAdequacyStandards: z.boolean().optional(),
    modifiedLengthOfContract: z.boolean().optional(),
    modifiedNonRiskPaymentArrangements: z.boolean().optional(),
})

const updateInfoSchema = z.object({
    updatedAt: z.date(),
    updatedBy: z.string().email(),
    updatedReason: z.string(),
})

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: contractFormDataSchema,
})

const ratesRevisionSchema = z.object({
    id: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    revisionFormData: z.string(),
})

// ContractRevision has all the information in a single submission of this contract.
// If a revision has been submitted it will have submitInfo (otherwise it will be a draft)
// if a revision was unlocked, it will have unlock info, otherwise it was an initial submission
// The set of rateRevisions hold exactly what rate data was present at the time this contract was submitted.
const contractRevisionZodSchema = contractRevisionSchema.extend({
    rateRevisions: z.array(ratesRevisionSchema),
})

// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
const contractZodSchema = z.object({
    id: z.string().uuid(),
    status: z.union([z.literal('SUBMITTED'), z.literal('DRAFT')]),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    revisions: z.array(contractRevisionZodSchema),
})

const draftContractZodSchema = contractZodSchema.extend({
    status: z.literal('DRAFT'),
    revisions: z.array(contractRevisionZodSchema).min(1),
})

type ContractFormData = z.infer<typeof contractFormDataSchema>
type Contract = z.infer<typeof contractZodSchema>
type ContractRevision = z.infer<typeof contractRevisionZodSchema>
type UpdateInfo = z.infer<typeof updateInfoSchema>
type ContractStatus = z.infer<typeof contractZodSchema.shape.status>

export { contractRevisionZodSchema, draftContractZodSchema, contractZodSchema }

export type {
    ContractFormData,
    Contract,
    ContractRevision,
    UpdateInfo,
    ContractStatus,
}
