import { z } from 'zod'
import * as v from "@badrap/valita";

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
} from '@mc-review/hpp'
import { statusSchema, valitaStatusSchema } from './statusType'
import type { RawCreateParams, ZodTypeAny } from 'zod/lib/types'

const documentSchema = z.object({
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string(),
    dateAdded: z.date().optional(), //  date added to the first submission to CMS
    downloadURL: z.string().optional(),
})
const valitaDocumentSchema = v.object({
    name: v.string(),
    s3URL: v.string(),
    sha256: v.string(),
    dateAdded: v.string().optional(), //  date not supported
    downloadURL: v.string().optional(),
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
const valitaPackagesWithSharedRateCerts = v.object({
    packageName: v.string(),
    packageId: v.string(),
    packageStatus: valitaStatusSchema.optional(),
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
const valitaActuarialFirmTypeSchema = v.union(
    v.literal('MERCER'),
    v.literal('MILLIMAN'),
    v.literal('OPTUMAS'),
    v.literal('GUIDEHOUSE'),
    v.literal('DELOITTE'),
    v.literal('STATE_IN_HOUSE'),
    v.literal('OTHER'),
)
const valitaActuaryContactSchema = v.object({
    id: v.string().optional(),
    name: v.string().optional(),
    titleRole: v.string().optional(),
    email: v.string().optional(), // email and or not supported
    actuarialFirm: valitaActuarialFirmTypeSchema.optional(),
    actuarialFirmOther: v.string().optional(),
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

const valitaSubmissionTypeSchema = v.union(
    v.literal('CONTRACT_ONLY'),
    v.literal('CONTRACT_AND_RATES'),
)
const valitaContractTypeSchema = v.union(v.literal('BASE'), v.literal('AMENDMENT'))
const valitaPopulationCoveredSchema = v.union(
    v.literal('MEDICAID'),
    v.literal('CHIP'),
    v.literal('MEDICAID_AND_CHIP'),
)
const valitaStateContactSchema = v.object({
    name: v.string().optional(),
    titleRole: v.string().optional(),
    email: v.string().optional(), //email and or not supported
})
const valitaContractExecutionStatusSchema = v.union(
    v.literal('EXECUTED'),
    v.literal('UNEXECUTED'),
)
const valitaManagedCareEntitiesSchema = v.union(
    v.literal('MCO'),
    v.literal('PIHP'),
    v.literal('PAHP'),
    v.literal('PCCM'),
)
const valitaFederalAuthoritySchema = v.union(
    v.literal('STATE_PLAN'),
    v.literal('WAIVER_1915B'),
    v.literal('WAIVER_1115'),
    v.literal('VOLUNTARY'),
    v.literal('BENCHMARK'),
    v.literal('TITLE_XXI'),
)
const DateType = v.string().chain((s) => {
    const date = new Date(s);
  
    if (isNaN(+date)) {
      return v.err("invalid date");
    }
  
    return v.ok(date);
  });
const valitaGenericContractFormDataSchema = v.object({
    programIDs: v.array(v.string()),
    submissionType: valitaSubmissionTypeSchema,
    submissionDescription: v.string(),
    contractType: valitaContractTypeSchema,

    populationCovered: valitaPopulationCoveredSchema,
    riskBasedContract: v.boolean(),
    stateContacts: v.array(valitaStateContactSchema),
    supportingDocuments: v.array(valitaDocumentSchema),
    contractExecutionStatus: valitaContractExecutionStatusSchema,
    contractDocuments: v.array(valitaDocumentSchema),
    contractDateStart: DateType, // date not supported
    contractDateEnd: DateType, // date not supported
    managedCareEntities: v.array(valitaManagedCareEntitiesSchema),
    federalAuthorities: v.array(valitaFederalAuthoritySchema),
    inLieuServicesAndSettings: v.boolean().optional(),
    modifiedBenefitsProvided: v.boolean().optional(),
    modifiedGeoAreaServed: v.boolean().optional(),
    modifiedMedicaidBeneficiaries: v.boolean().optional(),
    modifiedRiskSharingStrategy: v.boolean().optional(),
    modifiedIncentiveArrangements: v.boolean().optional(),
    modifiedWitholdAgreements: v.boolean().optional(),
    modifiedStateDirectedPayments: v.boolean().optional(),
    modifiedPassThroughPayments: v.boolean().optional(),
    modifiedPaymentsForMentalDiseaseInstitutions: v.boolean().optional(),
    modifiedMedicalLossRatioStandards: v.boolean().optional(),
    modifiedOtherFinancialPaymentIncentive: v.boolean().optional(),
    modifiedEnrollmentProcess: v.boolean().optional(),
    modifiedGrevienceAndAppeal: v.boolean().optional(),
    modifiedNetworkAdequacyStandards: v.boolean().optional(),
    modifiedLengthOfContract: v.boolean().optional(),
    modifiedNonRiskPaymentArrangements: v.boolean().optional(),
    statutoryRegulatoryAttestation: v.boolean().optional(), // will need to refactor preprocessNulls
    statutoryRegulatoryAttestationDescription: v.string().optional(),
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

const valitaContractFormDataSchema = valitaGenericContractFormDataSchema
// preprocessingNulls requires refactoring 
// .extend({
//     contractDateStart: preprocessNulls(
//         genericContractFormDataSchema.shape.contractDateStart.optional()
//     ),
//     contractDateEnd: preprocessNulls(
//         genericContractFormDataSchema.shape.contractDateEnd.optional()
//     ),
//     populationCovered: preprocessNulls(
//         genericContractFormDataSchema.shape.populationCovered.optional()
//     ),
//     riskBasedContract: preprocessNulls(
//         genericContractFormDataSchema.shape.riskBasedContract.optional()
//     ),
//     contractExecutionStatus: preprocessNulls(
//         genericContractFormDataSchema.shape.contractExecutionStatus.optional()
//     ),

//     inLieuServicesAndSettings: preprocessNulls(
//         genericContractFormDataSchema.shape.inLieuServicesAndSettings.optional()
//     ),
//     modifiedBenefitsProvided: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedBenefitsProvided.optional()
//     ),
//     modifiedGeoAreaServed: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedGeoAreaServed.optional()
//     ),
//     modifiedMedicaidBeneficiaries: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedMedicaidBeneficiaries.optional()
//     ),
//     modifiedRiskSharingStrategy: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedRiskSharingStrategy.optional()
//     ),
//     modifiedIncentiveArrangements: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedIncentiveArrangements.optional()
//     ),
//     modifiedWitholdAgreements: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedWitholdAgreements.optional()
//     ),
//     modifiedStateDirectedPayments: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedStateDirectedPayments.optional()
//     ),
//     modifiedPassThroughPayments: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedPassThroughPayments.optional()
//     ),
//     modifiedPaymentsForMentalDiseaseInstitutions: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedPaymentsForMentalDiseaseInstitutions.optional()
//     ),
//     modifiedMedicalLossRatioStandards: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedMedicalLossRatioStandards.optional()
//     ),
//     modifiedOtherFinancialPaymentIncentive: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedOtherFinancialPaymentIncentive.optional()
//     ),
//     modifiedEnrollmentProcess: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedEnrollmentProcess.optional()
//     ),
//     modifiedGrevienceAndAppeal: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedGrevienceAndAppeal.optional()
//     ),
//     modifiedNetworkAdequacyStandards: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedNetworkAdequacyStandards.optional()
//     ),
//     modifiedLengthOfContract: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedLengthOfContract.optional()
//     ),
//     modifiedNonRiskPaymentArrangements: preprocessNulls(
//         genericContractFormDataSchema.shape.modifiedNonRiskPaymentArrangements.optional()
//     ),
//     // statutoryRegulatoryAttestation: genericContractFormDataSchema.shape.statutoryRegulatoryAttestation.optional(),
// })

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
const valitaRateTypeSchema = v.union(
    v.literal('NEW'),
    v.literal('AMENDMENT')
)
const valitaRateCapitationTypeSchema = v.union(
    v.literal('RATE_CELL'),
    v.literal('RATE_RANGE'),
)
const valitaActuaryCommunicationTypeSchema = v.union(
    v.literal('OACT_TO_ACTUARY'),
    v.literal('OACT_TO_STATE'),
)
const valitaGenericRateFormDataSchema = v.object({
    id: v.string().optional(), // 10.4.23 eng pairing - we discussed future reactor that would delete this from the rate revision form data schema all together.
    rateID: v.string().optional(), // 10.4.23 eng pairing - we discussed future refactor to move this up to rate revision schema.
    rateType: valitaRateTypeSchema,
    rateCapitationType: valitaRateCapitationTypeSchema,
    rateDocuments: v.array(valitaDocumentSchema),
    supportingDocuments: v.array(valitaDocumentSchema),
    rateDateStart: v.string(), // date not supported
    rateDateEnd: v.string(), // date not supported
    rateDateCertified: v.string(), // date not supported
    amendmentEffectiveDateStart: v.string().optional(), // date not supported, preprocess nulls need refactoring
    amendmentEffectiveDateEnd: v.string().optional(),// date not supported, preprocess nulls need refactoring
    deprecatedRateProgramIDs: v.array(v.string()),
    rateProgramIDs: v.array(v.string()),
    rateCertificationName: v.string(),
    certifyingActuaryContacts: v.array(valitaActuaryContactSchema),
    addtlActuaryContacts: v.array(valitaActuaryContactSchema),
    actuaryCommunicationPreference: valitaActuaryCommunicationTypeSchema,
    packagesWithSharedRateCerts: v.array(valitaPackagesWithSharedRateCerts),
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

const valitaRateFormDataSchema = valitaGenericRateFormDataSchema
// .extend({
//     // id: genericRateFormDataSchema.shape.id.optional(),
//     // rateID: genericRateFormDataSchema.shape.rateID.optional(),
//     rateType: preprocessNulls(
//         genericRateFormDataSchema.shape.rateType.optional()
//     ),
//     rateCapitationType: preprocessNulls(
//         genericRateFormDataSchema.shape.rateCapitationType.optional()
//     ),
//     rateDocuments: preprocessNulls(
//         genericRateFormDataSchema.shape.rateDocuments.optional()
//     ),
//     supportingDocuments: preprocessNulls(
//         genericRateFormDataSchema.shape.supportingDocuments.optional()
//     ),
//     rateDateStart: preprocessNulls(
//         genericRateFormDataSchema.shape.rateDateStart.optional()
//     ),
//     rateDateEnd: preprocessNulls(
//         genericRateFormDataSchema.shape.rateDateEnd.optional()
//     ),
//     rateDateCertified: preprocessNulls(
//         genericRateFormDataSchema.shape.rateDateCertified.optional()
//     ),
//     deprecatedRateProgramIDs: preprocessNulls(
//         genericRateFormDataSchema.shape.deprecatedRateProgramIDs.optional()
//     ),
//     rateProgramIDs: preprocessNulls(
//         genericRateFormDataSchema.shape.rateProgramIDs.optional()
//     ),
//     rateCertificationName: preprocessNulls(
//         genericRateFormDataSchema.shape.rateCertificationName.optional()
//     ),
//     certifyingActuaryContacts: preprocessNulls(
//         genericRateFormDataSchema.shape.certifyingActuaryContacts.optional()
//     ),
//     addtlActuaryContacts: preprocessNulls(
//         genericRateFormDataSchema.shape.addtlActuaryContacts.optional()
//     ),
//     actuaryCommunicationPreference: preprocessNulls(
//         genericRateFormDataSchema.shape.actuaryCommunicationPreference.optional()
//     ),
//     packagesWithSharedRateCerts: preprocessNulls(
//         genericRateFormDataSchema.shape.packagesWithSharedRateCerts.optional()
//     ),
// })

const submittableRateFormDataSchema = genericRateFormDataSchema.extend({
    rateDocuments: genericRateFormDataSchema.shape.rateDocuments.nonempty(),
    rateProgramIDs: genericRateFormDataSchema.shape.rateProgramIDs.nonempty(),
    certifyingActuaryContacts:
        genericRateFormDataSchema.shape.certifyingActuaryContacts.nonempty(),
})

type DocumentType = z.infer<typeof documentSchema>
type ContractFormDataType = z.infer<typeof contractFormDataSchema>
type RateFormDataType = z.infer<typeof rateFormDataSchema>

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
    valitaContractFormDataSchema,
    valitaRateFormDataSchema
}

export type {
    ContractFormDataType,
    RateFormDataType,
    DocumentType,
    RateFormEditableType,
    ContractFormEditableType,
    StateContactType,
    ActuaryContactType,
}
