import { z } from 'zod'
import {
    actuarialFirmTypeSchema,
    actuaryCommunicationTypeSchema,
    contractExecutionStatusSchema,
    contractTypeSchema,
    federalAuthoritySchema,
    populationCoveredSchema,
    rateCapitationTypeSchema,
    rateTypeSchema,
    submissionTypeSchema,
    rateMedicaidPopulationsSchema,
} from '@mc-review/hpp'
import { statusSchema } from './statusType'
import type { RawCreateParams, ZodTypeAny } from 'zod/lib/types'

const documentSchema = z.object({
    id: z.string().optional(),
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

const stateContactSchema = z.object({
    name: z.string().optional(),
    titleRole: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
})

const actuaryContactSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    titleRole: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    actuarialFirm: actuarialFirmTypeSchema.optional(),
    actuarialFirmOther: z.string().optional(),
})

function preprocessNulls<T extends ZodTypeAny>(
    schema: T,
    params?: RawCreateParams
) {
    return z.preprocess((val) => val ?? undefined, schema, params)
}

// genericContractFormDataSchema has all the types for all fields in ContractFormData
// they will be modified to create the draft and the submitted types.
const genericContractFormDataSchema = z.object({
    programIDs: z.array(z.string()),
    submissionType: submissionTypeSchema,
    submissionDescription: z.string(),
    contractType: contractTypeSchema,

    populationCovered: populationCoveredSchema,
    riskBasedContract: z.boolean(),
    dsnpContract: z.boolean().optional(),
    stateContacts: z.array(stateContactSchema),
    supportingDocuments: z.array(documentSchema),
    contractExecutionStatus: contractExecutionStatusSchema,
    contractDocuments: z.array(documentSchema),
    contractDateStart: z.date(),
    contractDateEnd: z.date(),
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
    statutoryRegulatoryAttestation: preprocessNulls(z.boolean().optional()),
    statutoryRegulatoryAttestationDescription: preprocessNulls(
        z.string().optional()
    ),
})

// contractFormDataSchema is the normal contractFormData setup for Draft contracts. Most fields are optional and array fields can be empty.
const contractFormDataSchema = genericContractFormDataSchema.extend({
    contractDateStart: preprocessNulls(
        genericContractFormDataSchema.shape.contractDateStart.optional()
    ),
    contractDateEnd: preprocessNulls(
        genericContractFormDataSchema.shape.contractDateEnd.optional()
    ),
    populationCovered: preprocessNulls(
        genericContractFormDataSchema.shape.populationCovered.optional()
    ),
    riskBasedContract: preprocessNulls(
        genericContractFormDataSchema.shape.riskBasedContract.optional()
    ),
    dsnpContract: preprocessNulls(
        genericContractFormDataSchema.shape.dsnpContract.optional()
    ),
    contractExecutionStatus: preprocessNulls(
        genericContractFormDataSchema.shape.contractExecutionStatus.optional()
    ),

    inLieuServicesAndSettings: preprocessNulls(
        genericContractFormDataSchema.shape.inLieuServicesAndSettings.optional()
    ),
    modifiedBenefitsProvided: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedBenefitsProvided.optional()
    ),
    modifiedGeoAreaServed: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedGeoAreaServed.optional()
    ),
    modifiedMedicaidBeneficiaries: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedMedicaidBeneficiaries.optional()
    ),
    modifiedRiskSharingStrategy: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedRiskSharingStrategy.optional()
    ),
    modifiedIncentiveArrangements: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedIncentiveArrangements.optional()
    ),
    modifiedWitholdAgreements: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedWitholdAgreements.optional()
    ),
    modifiedStateDirectedPayments: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedStateDirectedPayments.optional()
    ),
    modifiedPassThroughPayments: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedPassThroughPayments.optional()
    ),
    modifiedPaymentsForMentalDiseaseInstitutions: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedPaymentsForMentalDiseaseInstitutions.optional()
    ),
    modifiedMedicalLossRatioStandards: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedMedicalLossRatioStandards.optional()
    ),
    modifiedOtherFinancialPaymentIncentive: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedOtherFinancialPaymentIncentive.optional()
    ),
    modifiedEnrollmentProcess: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedEnrollmentProcess.optional()
    ),
    modifiedGrevienceAndAppeal: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedGrevienceAndAppeal.optional()
    ),
    modifiedNetworkAdequacyStandards: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedNetworkAdequacyStandards.optional()
    ),
    modifiedLengthOfContract: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedLengthOfContract.optional()
    ),
    modifiedNonRiskPaymentArrangements: preprocessNulls(
        genericContractFormDataSchema.shape.modifiedNonRiskPaymentArrangements.optional()
    ),
    // statutoryRegulatoryAttestation: genericContractFormDataSchema.shape.statutoryRegulatoryAttestation.optional(),
})

// submittedFormDataSchema is the schema used during submission validation. Most fields are required and most arrays are nonempty.
// refinements check for validations across the whole formData
const submittableContractFormDataSchema = genericContractFormDataSchema
    .extend({
        managedCareEntities:
            genericContractFormDataSchema.shape.managedCareEntities.nonempty(),
        stateContacts:
            genericContractFormDataSchema.shape.stateContacts.nonempty(),
        contractDocuments:
            genericContractFormDataSchema.shape.contractDocuments.nonempty(),
        federalAuthorities:
            genericContractFormDataSchema.shape.federalAuthorities.nonempty(),
    })
    .superRefine((formData, ctx) => {
        if (
            formData.populationCovered === 'CHIP' &&
            formData.submissionType === 'CONTRACT_AND_RATES'
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'cannot submit rates with CHIP only populationCovered',
            })
        }
    })
const genericRateFormDataSchema = z.object({
    id: z.string().optional(), // 10.4.23 eng pairing - we discussed future reactor that would delete this from the rate revision form data schema all together.
    rateID: z.string().optional(), // 10.4.23 eng pairing - we discussed future refactor to move this up to rate revision schema.
    rateType: rateTypeSchema,
    rateCapitationType: rateCapitationTypeSchema,
    rateDocuments: z.array(documentSchema),
    supportingDocuments: z.array(documentSchema),
    rateDateStart: z.date(),
    rateDateEnd: z.date(),
    rateDateCertified: z.date(),
    rateMedicaidPopulations: z.array(rateMedicaidPopulationsSchema).optional(),
    amendmentEffectiveDateStart: preprocessNulls(z.date().optional()),
    amendmentEffectiveDateEnd: preprocessNulls(z.date().optional()),
    deprecatedRateProgramIDs: z.array(z.string()),
    rateProgramIDs: z.array(z.string()),
    rateCertificationName: z.string(),
    certifyingActuaryContacts: z.array(actuaryContactSchema),
    addtlActuaryContacts: z.array(actuaryContactSchema),
    actuaryCommunicationPreference: actuaryCommunicationTypeSchema,
    packagesWithSharedRateCerts: z.array(packagesWithSharedRateCerts),
})

const rateFormDataSchema = genericRateFormDataSchema.extend({
    // id: genericRateFormDataSchema.shape.id.optional(),
    // rateID: genericRateFormDataSchema.shape.rateID.optional(),
    rateType: preprocessNulls(
        genericRateFormDataSchema.shape.rateType.optional()
    ),
    rateCapitationType: preprocessNulls(
        genericRateFormDataSchema.shape.rateCapitationType.optional()
    ),
    rateDocuments: preprocessNulls(
        genericRateFormDataSchema.shape.rateDocuments.optional()
    ),
    supportingDocuments: preprocessNulls(
        genericRateFormDataSchema.shape.supportingDocuments.optional()
    ),
    rateDateStart: preprocessNulls(
        genericRateFormDataSchema.shape.rateDateStart.optional()
    ),
    rateDateEnd: preprocessNulls(
        genericRateFormDataSchema.shape.rateDateEnd.optional()
    ),
    rateDateCertified: preprocessNulls(
        genericRateFormDataSchema.shape.rateDateCertified.optional()
    ),
    deprecatedRateProgramIDs: preprocessNulls(
        genericRateFormDataSchema.shape.deprecatedRateProgramIDs.optional()
    ),
    rateProgramIDs: preprocessNulls(
        genericRateFormDataSchema.shape.rateProgramIDs.optional()
    ),
    rateMedicaidPopulations: preprocessNulls(
        genericRateFormDataSchema.shape.rateMedicaidPopulations.optional()
    ),
    rateCertificationName: preprocessNulls(
        genericRateFormDataSchema.shape.rateCertificationName.optional()
    ),
    certifyingActuaryContacts: preprocessNulls(
        genericRateFormDataSchema.shape.certifyingActuaryContacts.optional()
    ),
    addtlActuaryContacts: preprocessNulls(
        genericRateFormDataSchema.shape.addtlActuaryContacts.optional()
    ),
    actuaryCommunicationPreference: preprocessNulls(
        genericRateFormDataSchema.shape.actuaryCommunicationPreference.optional()
    ),
    packagesWithSharedRateCerts: preprocessNulls(
        genericRateFormDataSchema.shape.packagesWithSharedRateCerts.optional()
    ),
})

const strippedRateFormDataSchema = rateFormDataSchema.omit({
    rateDocuments: true,
    addtlActuaryContacts: true,
    certifyingActuaryContacts: true,
    actuaryCommunicationPreference: true,
    packagesWithSharedRateCerts: true,
    supportingDocuments: true,
})

const submittableRateFormDataSchema = genericRateFormDataSchema.extend({
    rateDocuments: genericRateFormDataSchema.shape.rateDocuments.nonempty(),
    rateProgramIDs: genericRateFormDataSchema.shape.rateProgramIDs.nonempty(),
    certifyingActuaryContacts:
        genericRateFormDataSchema.shape.certifyingActuaryContacts.nonempty(),
})

type DocumentType = z.infer<typeof documentSchema>
type ContractFormDataType = z.infer<typeof contractFormDataSchema>
type RateFormDataType = z.infer<typeof rateFormDataSchema>
type StrippedRateFormDataType = z.infer<typeof strippedRateFormDataSchema>

type ContractFormEditableType = Partial<ContractFormDataType>
type RateFormEditableType = Partial<RateFormDataType>
type StateContactType = z.infer<typeof stateContactSchema>
type ActuaryContactType = z.infer<typeof actuaryContactSchema>

export {
    submittableContractFormDataSchema,
    submittableRateFormDataSchema,
    contractFormDataSchema,
    rateFormDataSchema,
    preprocessNulls,
    documentSchema,
    strippedRateFormDataSchema,
}

export type {
    ContractFormDataType,
    RateFormDataType,
    DocumentType,
    RateFormEditableType,
    ContractFormEditableType,
    StateContactType,
    ActuaryContactType,
    StrippedRateFormDataType,
}
