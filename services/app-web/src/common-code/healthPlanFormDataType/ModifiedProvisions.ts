/*
    Includes all possible keys and generalized types for provisions question. 
    Specific contract types and population covered limit the overall list. 
    Those keys are defined farther down in the file.

    Order matters in this file - we iterate through the list to generate yes/no provision radio buttons in order.
    Stakeholders want questions in specific order.
*/
const modifiedProvisionKeys = [
    // 'inLieuServicesAndSettings',
    'modifiedBenefitsProvided',
    'modifiedGeoAreaServed',
    'modifiedMedicaidBeneficiaries',
    'modifiedEnrollmentProcess',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedMedicalLossRatioStandards',
    'modifiedOtherFinancialPaymentIncentive',
    'modifiedGrevienceAndAppeal',
    'modifiedNetworkAdequacyStandards',
    'modifiedLengthOfContract',
    'modifiedNonRiskPaymentArrangements',
] as const

type ProvisionType = (typeof modifiedProvisionKeys)[number]

/*
   Medicaid contract amendment logic.
   Relevant for amendments that have population covered of Medicaid or Medicaid and CHIP.
*/
const modifiedProvisionMedicaidAmendmentKeys = [
    'modifiedBenefitsProvided',
    'modifiedGeoAreaServed',
    'modifiedMedicaidBeneficiaries',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedMedicalLossRatioStandards',
    'modifiedOtherFinancialPaymentIncentive',
    'modifiedEnrollmentProcess',
    'modifiedGrevienceAndAppeal',
    'modifiedNetworkAdequacyStandards',
    'modifiedLengthOfContract',
    'modifiedNonRiskPaymentArrangements',
] as const

type ProvisionTypeMedicaidAmendment =
    (typeof modifiedProvisionMedicaidAmendmentKeys)[number]

type ModifiedProvisionsMedicaidAmendment = {
    [K in ProvisionTypeMedicaidAmendment]: boolean
}

function isMedicaidAmendmentProvision(
    provision: ProvisionTypeMedicaidAmendment | ProvisionType
): provision is ProvisionTypeMedicaidAmendment {
    return modifiedProvisionKeys.includes(
        provision as ProvisionTypeMedicaidAmendment
    )
}

/*
   Medicaid base contract logic
   Relevant for base contracts that have population covered of Medicaid or Medicaid and CHIP.
*/

const modifiedProvisionMedicaidBaseKeys = [
    // 'inLieuServicesAndSettings',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedNonRiskPaymentArrangements',
] as const

type ModifiedProvisionsMedicaidBase = {
    [K in (typeof modifiedProvisionMedicaidBaseKeys)[number]]: boolean
}

type ModifiedProvisions = {
    [K in (typeof modifiedProvisionKeys)[number]]: boolean
} // form data type that requires all of the keys

/*
    CHIP only logic
    Relevant for amendments that have population covered of CHIP.
*/
const excludedProvisionsForCHIP = [
    // 'inLieuServicesAndSettings',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedOtherFinancialPaymentIncentive',
] as const

type CHIPExcludedProvisionType = (typeof excludedProvisionsForCHIP)[number]
type CHIPValidProvisionType = Exclude<ProvisionType, CHIPExcludedProvisionType>

type CHIPModifiedProvisions = Omit<
    ModifiedProvisions,
    CHIPExcludedProvisionType
> // form data type that requires all of the keys

function isCHIPProvision(
    provision: CHIPValidProvisionType | ProvisionType
): provision is CHIPValidProvisionType {
    return !excludedProvisionsForCHIP.includes(
        provision as CHIPExcludedProvisionType
    )
}
const allowedProvisionKeysForCHIP = modifiedProvisionKeys.filter((p) =>
    isCHIPProvision(p)
) as CHIPValidProvisionType[] // type coercion to narrow return type, we already used a type guard earlier so feel can feel confident

export type {
    ModifiedProvisionsMedicaidAmendment,
    ModifiedProvisionsMedicaidBase,
    CHIPModifiedProvisions,
    ProvisionType,
    ProvisionTypeMedicaidAmendment,
}

export {
    modifiedProvisionKeys,
    modifiedProvisionMedicaidBaseKeys,
    modifiedProvisionMedicaidAmendmentKeys,
    excludedProvisionsForCHIP,
    allowedProvisionKeysForCHIP,
    isCHIPProvision,
    isMedicaidAmendmentProvision,
}
