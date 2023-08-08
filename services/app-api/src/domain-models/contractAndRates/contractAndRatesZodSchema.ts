import { z } from 'zod'
import {
    actuaryCommunicationTypeSchema,
    actuaryContactSchema,
    contractExecutionStatusSchema,
    contractTypeSchema,
    federalAuthoritySchema,
    populationCoveredSchema,
    rateCapitationTypeSchema,
    rateTypeSchema,
    sharedRateCertDisplay,
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

// The rate form data  is the form filled out by state users submitting rates for review
const rateFormDataSchema = z.object({
    id: z.string().optional(),
    rateType: rateTypeSchema.optional(),
    rateCapitationType: rateCapitationTypeSchema.optional(),
    rateDocuments: z.array(submissionDocumentSchema).optional(),
    supportingDocuments: z.array(submissionDocumentSchema).optional(),
    rateDateStart: z.date().optional(),
    rateDateEnd: z.date().optional(),
    rateDateCertified: z.date().optional(),
    amendmentEffectiveDateStart: z.date().optional(),
    amendmentEffectiveDateEnd: z.date().optional(),
    rateProgramIDs: z.array(z.string()).optional(),
    rateCertificationName: z.string().optional(),
    certifyingActuaryContacts: z.array(actuaryContactSchema).optional(),
    addtlActuaryContacts: z.array(actuaryContactSchema).optional(),
    actuaryCommunicationPreference: actuaryCommunicationTypeSchema.optional(),
    packagesWithSharedRateCerts: z.array(sharedRateCertDisplay).optional(),
})

// A Rate represents all the data associated with a single rate certification over time.
// The rate's revisions field hold the array of rate revisions that show change history of specific rate data
// The first revision (array index 0) is the current revision
const ratesRevisionSchema = z.object({
    id: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    revisionFormData: rateFormDataSchema,
})

// ContractRevision has all the information in a single submission of this contract.
// If a revision has been submitted it will have submitInfo (otherwise it will be a draft)
// if a revision was unlocked, it will have unlock info, otherwise it was an initial submission
// The set of rateRevisions hold exactly what rate data was present at the time this contract was submitted.
const contractRevisionWithRatesSchema = contractRevisionSchema.extend({
    rateRevisions: z.array(ratesRevisionSchema),
})

const rateRevisionWithContractsSchema = ratesRevisionSchema.extend({
    contractRevisions: z.array(contractRevisionSchema),
})

// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
const contractZodSchema = z.object({
    id: z.string().uuid(),
    status: z.union([z.literal('SUBMITTED'), z.literal('DRAFT')]),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    revisions: z.array(contractRevisionWithRatesSchema),
})

const draftContractZodSchema = contractZodSchema.extend({
    status: z.literal('DRAFT'),
    revisions: z.array(contractRevisionWithRatesSchema).min(1),
})

const rateZodSchema = z.object({
    id: z.string().uuid(),
    status: z.union([z.literal('SUBMITTED'), z.literal('DRAFT')]),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    revisions: z.array(rateRevisionWithContractsSchema),
})

type ContractType = z.infer<typeof contractZodSchema>
type ContractRevisionType = z.infer<typeof contractRevisionSchema>
type ContractRevisionWithRatesType = z.infer<
    typeof contractRevisionWithRatesSchema
>
type ContractFormDataType = z.infer<typeof contractFormDataSchema>

type RateType = z.infer<typeof rateZodSchema>
type RateRevisionType = z.infer<typeof ratesRevisionSchema>
type RateRevisionWithContractsType = z.infer<
    typeof rateRevisionWithContractsSchema
>
type RateFormDataType = z.infer<typeof rateFormDataSchema>

type UpdateInfoType = z.infer<typeof updateInfoSchema>
type ContractStatusType = z.infer<typeof contractZodSchema.shape.status>

export {
    contractRevisionWithRatesSchema,
    draftContractZodSchema,
    contractZodSchema,
}

export type {
    ContractType,
    ContractRevisionType,
    ContractRevisionWithRatesType,
    ContractFormDataType,
    RateType,
    RateRevisionType,
    RateRevisionWithContractsType,
    RateFormDataType,
    UpdateInfoType,
    ContractStatusType,
}
