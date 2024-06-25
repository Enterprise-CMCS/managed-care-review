import type { ZodSchema } from 'zod'
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
    stateContactSchema,
    submissionTypeSchema,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto/zodSchemas'
import { statusSchema } from './statusType'

const documentSchema = z.object({
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string(),
    dateAdded: z.date().optional(), //  date added to the first submission to CMS
    downloadURL: z.string().optional(),
})

const managedCareEntitiesSchema = z.union([
    z.literal('MCO'),
    z.literal('PIHP'),
    z.literal('PAHP'),
    z.literal('PCCM'),
])

const packagesWithSharedRateCerts = z.object({
    packageName: z.string(),
    packageId: z.string(),
    packageStatus: statusSchema.optional(),
})

// Wraps schema to make it optional and transforms null to undefined. This will take nulls from graphql inputs and turn them to undefined.
const nullishTransformWrapper = (schema: ZodSchema) =>
    schema
        .optional()
        .nullish()
        .transform((value) => value ?? undefined)

const contractFormDataSchema = z.object({
    programIDs: z.array(z.string()),
    populationCovered: nullishTransformWrapper(populationCoveredSchema),
    submissionType: submissionTypeSchema,
    riskBasedContract: nullishTransformWrapper(z.boolean()),
    submissionDescription: z.string(),
    stateContacts: z.array(stateContactSchema),
    supportingDocuments: z.array(documentSchema),
    contractType: contractTypeSchema,
    contractExecutionStatus: nullishTransformWrapper(
        contractExecutionStatusSchema
    ),
    contractDocuments: z.array(documentSchema),
    contractDateStart: nullishTransformWrapper(z.date()),
    contractDateEnd: nullishTransformWrapper(z.date()),
    managedCareEntities: z.array(managedCareEntitiesSchema),
    federalAuthorities: z.array(federalAuthoritySchema),
    inLieuServicesAndSettings: nullishTransformWrapper(z.boolean()),
    modifiedBenefitsProvided: nullishTransformWrapper(z.boolean()),
    modifiedGeoAreaServed: nullishTransformWrapper(z.boolean()),
    modifiedMedicaidBeneficiaries: nullishTransformWrapper(z.boolean()),
    modifiedRiskSharingStrategy: nullishTransformWrapper(z.boolean()),
    modifiedIncentiveArrangements: nullishTransformWrapper(z.boolean()),
    modifiedWitholdAgreements: nullishTransformWrapper(z.boolean()),
    modifiedStateDirectedPayments: nullishTransformWrapper(z.boolean()),
    modifiedPassThroughPayments: nullishTransformWrapper(z.boolean()),
    modifiedPaymentsForMentalDiseaseInstitutions: nullishTransformWrapper(
        z.boolean()
    ),
    modifiedMedicalLossRatioStandards: nullishTransformWrapper(z.boolean()),
    modifiedOtherFinancialPaymentIncentive: nullishTransformWrapper(
        z.boolean()
    ),
    modifiedEnrollmentProcess: nullishTransformWrapper(z.boolean()),
    modifiedGrevienceAndAppeal: nullishTransformWrapper(z.boolean()),
    modifiedNetworkAdequacyStandards: nullishTransformWrapper(z.boolean()),
    modifiedLengthOfContract: nullishTransformWrapper(z.boolean()),
    modifiedNonRiskPaymentArrangements: nullishTransformWrapper(z.boolean()),
    statutoryRegulatoryAttestation: nullishTransformWrapper(z.boolean()),
    statutoryRegulatoryAttestationDescription: nullishTransformWrapper(
        z.string()
    ),
})

const rateFormDataSchema = z.object({
    id: z.string().optional(), // 10.4.23 eng pairing - we discussed future reactor that would delete this from the rate revision form data schema all together.
    rateID: z.string().optional(), // 10.4.23 eng pairing - we discussed future refactor to move this up to rate revision schema.
    rateType: rateTypeSchema.optional(),
    rateCapitationType: rateCapitationTypeSchema.optional(),
    rateDocuments: z.array(documentSchema).optional(),
    supportingDocuments: z.array(documentSchema).optional(),
    rateDateStart: z.date().optional(),
    rateDateEnd: z.date().optional(),
    rateDateCertified: z.date().optional(),
    amendmentEffectiveDateStart: z.date().optional(),
    amendmentEffectiveDateEnd: z.date().optional(),
    deprecatedRateProgramIDs: z.array(z.string()).optional(),
    rateProgramIDs: z.array(z.string()).optional(),
    rateCertificationName: z.string().optional(),
    certifyingActuaryContacts: z.array(actuaryContactSchema).optional(),
    addtlActuaryContacts: z.array(actuaryContactSchema).optional(),
    actuaryCommunicationPreference: actuaryCommunicationTypeSchema.optional(),
    packagesWithSharedRateCerts: z
        .array(packagesWithSharedRateCerts)
        .optional(),
})

type DocumentType = z.infer<typeof documentSchema>
type ContractFormDataType = z.infer<typeof contractFormDataSchema>
type RateFormDataType = z.infer<typeof rateFormDataSchema>

type ContractFormEditableType = Partial<ContractFormDataType>
type RateFormEditableType = Partial<RateFormDataType>

export { contractFormDataSchema, rateFormDataSchema, nullishTransformWrapper }

export type {
    ContractFormDataType,
    RateFormDataType,
    DocumentType,
    RateFormEditableType,
    ContractFormEditableType,
}
