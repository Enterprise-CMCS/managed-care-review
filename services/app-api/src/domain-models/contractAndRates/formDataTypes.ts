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
import type { ZodEffects } from 'zod/lib/types'
import type { RawCreateParams, ZodTypeAny } from 'zod/lib/types'

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

function preprocessNulls<T extends ZodTypeAny>(
    schema: T,
    params?: RawCreateParams
): ZodEffects<T, T['_output'], unknown> {
    return z.preprocess((val) => val ?? undefined, schema, params)
}

const contractFormDataSchema = z.object({
    programIDs: z.array(z.string()),
    populationCovered: preprocessNulls(populationCoveredSchema.optional()),
    submissionType: submissionTypeSchema,
    riskBasedContract: preprocessNulls(z.boolean().optional()),
    submissionDescription: z.string(),
    stateContacts: z.array(stateContactSchema),
    supportingDocuments: z.array(documentSchema),
    contractType: contractTypeSchema,
    contractExecutionStatus: preprocessNulls(
        contractExecutionStatusSchema.optional()
    ),
    contractDocuments: z.array(documentSchema),
    contractDateStart: preprocessNulls(z.date().optional()),
    contractDateEnd: preprocessNulls(z.date().optional()),
    managedCareEntities: z.array(managedCareEntitiesSchema),
    federalAuthorities: z.array(federalAuthoritySchema),
    inLieuServicesAndSettings: preprocessNulls(z.boolean().optional()),
    modifiedBenefitsProvided: preprocessNulls(z.boolean().optional()),
    modifiedGeoAreaServed: preprocessNulls(z.boolean().optional()),
    modifiedMedicaidBeneficiaries: preprocessNulls(z.boolean().optional()),
    modifiedRiskSharingStrategy: preprocessNulls(z.boolean().optional()),
    modifiedIncentiveArrangements: preprocessNulls(z.boolean().optional()),
    modifiedWitholdAgreements: preprocessNulls(z.boolean().optional()),
    modifiedStateDirectedPayments: preprocessNulls(z.boolean().optional()),
    modifiedPassThroughPayments: preprocessNulls(z.boolean().optional()),
    modifiedPaymentsForMentalDiseaseInstitutions: preprocessNulls(
        z.boolean().optional()
    ),
    modifiedMedicalLossRatioStandards: preprocessNulls(z.boolean().optional()),
    modifiedOtherFinancialPaymentIncentive: preprocessNulls(
        z.boolean().optional()
    ),
    modifiedEnrollmentProcess: preprocessNulls(z.boolean().optional()),
    modifiedGrevienceAndAppeal: preprocessNulls(z.boolean().optional()),
    modifiedNetworkAdequacyStandards: preprocessNulls(z.boolean().optional()),
    modifiedLengthOfContract: preprocessNulls(z.boolean().optional()),
    modifiedNonRiskPaymentArrangements: preprocessNulls(z.boolean().optional()),
    statutoryRegulatoryAttestation: preprocessNulls(z.boolean().optional()),
    statutoryRegulatoryAttestationDescription: preprocessNulls(
        z.string().optional()
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

export { contractFormDataSchema, rateFormDataSchema, preprocessNulls }

export type {
    ContractFormDataType,
    RateFormDataType,
    DocumentType,
    RateFormEditableType,
    ContractFormEditableType,
}
