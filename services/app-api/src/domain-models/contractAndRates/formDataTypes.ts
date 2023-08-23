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

type ContractFormDataType = z.infer<typeof contractFormDataSchema>
type RateFormDataType = z.infer<typeof rateFormDataSchema>

export { contractFormDataSchema, rateFormDataSchema }

export type { ContractFormDataType, RateFormDataType }
