import { z } from 'zod'
import { rateRevisionSchema } from './rateTypes'
import { updateInfoSchema } from './updateInfoType'
import {
    contractExecutionStatusSchema,
    contractTypeSchema,
    federalAuthoritySchema,
    populationCoveredSchema,
    stateContactSchema,
    submissionTypeSchema,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto/zodSchemas'

const documentSchema = z.object({
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string().optional(),
})

const managedCareEntitiesSchema = z.union([
    z.literal('MCO'),
    z.literal('PIHP'),
    z.literal('PAHP'),
    z.literal('PCCM'),
])

const contractFormDataSchema = z.object({
    programIDs: z.array(z.string()),
    populationCovered: populationCoveredSchema.optional(),
    submissionType: submissionTypeSchema,
    riskBasedContract: z.boolean().optional(),
    submissionDescription: z.string(),
    stateContacts: z.array(stateContactSchema),
    supportingDocuments: z.array(documentSchema),
    contractType: contractTypeSchema,
    contractExecutionStatus: contractExecutionStatusSchema.optional(),
    contractDocuments: z.array(documentSchema),
    contractDateStart: z.date().optional(),
    contractDateEnd: z.date().optional(),
    managedCareEntities: z.array(managedCareEntitiesSchema),
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

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: contractFormDataSchema,
})

// ContractRevision has all the information in a single submission of this contract.
// If a revision has been submitted it will have submitInfo (otherwise it will be a draft)
// if a revision was unlocked, it will have unlock info, otherwise it was an initial submission
// The set of rateRevisions hold exactly what rate data was present at the time this contract was submitted.
const contractRevisionWithRatesSchema = contractRevisionSchema.extend({
    rateRevisions: z.array(rateRevisionSchema),
})

// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
const contractSchema = z.object({
    id: z.string().uuid(),
    status: z.union([z.literal('SUBMITTED'), z.literal('DRAFT')]),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    // If this contract is in a DRAFT or UNLOCKED status, there will be a draftRevision
    draftRevision: contractRevisionWithRatesSchema.optional(),
    // All revisions are submitted and in reverse chronological order
    revisions: z.array(contractRevisionWithRatesSchema),
})

const draftContractSchema = contractSchema.extend({
    status: z.literal('DRAFT'),
    revisions: z.array(contractRevisionWithRatesSchema).min(1),
})

type ContractType = z.infer<typeof contractSchema>
type ContractRevisionType = z.infer<typeof contractRevisionSchema>
type ContractRevisionWithRatesType = z.infer<
    typeof contractRevisionWithRatesSchema
>
type ContractFormDataType = z.infer<typeof contractFormDataSchema>

export {
    contractRevisionSchema,
    contractRevisionWithRatesSchema,
    draftContractSchema,
    contractSchema,
}

export type {
    ContractType,
    ContractRevisionType,
    ContractRevisionWithRatesType,
    ContractFormDataType,
}
