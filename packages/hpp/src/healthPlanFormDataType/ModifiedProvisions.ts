/*
    Each provision key represents a Yes/No question asked on Contract Details. 
    This is a types file describing the shape of this data.

    There are currently three distrinct variants of the provisions questions: 
    1. For CHIP amendment
    2. For non CHIP base contract
    3. For non CHIP contract amendment
    
    This file also includes a generalized type to reference all possible provisions keys.

    Order matters in this file for keys arrays - we iterate through the list to generate yes/no provision radio buttons in order.
    Stakeholders want questions in specific order.

    See also provisions.ts
*/

type GeneralizedProvisionType = CHIPProvisionType | MedicaidBaseProvisionType | MedicaidAmendmentProvisionType
type GeneralizedModifiedProvisions = {
    [K in GeneralizedProvisionType ]: boolean
}

/*
    CHIP only logic
    Relevant for amendments that have population covered of CHIP.
*/
const provisionCHIPKeys = [
    'modifiedBenefitsProvided',
    'modifiedGeoAreaServed',
    'modifiedMedicaidBeneficiaries',
    'modifiedEnrollmentProcess',
    'modifiedMedicalLossRatioStandards',
    'modifiedGrevienceAndAppeal',
    'modifiedNetworkAdequacyStandards',
    'modifiedLengthOfContract',
    'modifiedNonRiskPaymentArrangements',
] as const

type CHIPProvisionType = (typeof provisionCHIPKeys)[number]

type CHIPModifiedProvisions = {
    [K in CHIPProvisionType]: boolean
}

function isCHIPProvision(
    provision: CHIPProvisionType | GeneralizedProvisionType
): provision is CHIPProvisionType {
    return provisionCHIPKeys.includes(provision as CHIPProvisionType)
}
/*
   Medicaid base contract logic
   Relevant for base contracts that have population covered of Medicaid or Medicaid and CHIP.
*/

const modifiedProvisionMedicaidBaseKeys = [
    'inLieuServicesAndSettings',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedNonRiskPaymentArrangements',
] as const

type MedicaidBaseProvisionType =
    (typeof modifiedProvisionMedicaidBaseKeys)[number]

type ModifiedProvisionsMedicaidBase = {
    [K in MedicaidBaseProvisionType]: boolean
}

function isMedicaidBaseProvision(
    provision: MedicaidBaseProvisionType | GeneralizedProvisionType
): provision is MedicaidBaseProvisionType {
    return modifiedProvisionMedicaidBaseKeys.includes(
        provision as MedicaidBaseProvisionType
    )
}

/*
   Medicaid contract amendment logic.
   Relevant for amendments that have population covered of Medicaid or Medicaid and CHIP.
*/
const modifiedProvisionMedicaidAmendmentKeys = [
    'inLieuServicesAndSettings',
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

type MedicaidAmendmentProvisionType =
    (typeof modifiedProvisionMedicaidAmendmentKeys)[number]

type ModifiedProvisionsMedicaidAmendment = {
    [K in MedicaidAmendmentProvisionType]: boolean
}

function isMedicaidAmendmentProvision(
    provision: MedicaidAmendmentProvisionType | GeneralizedProvisionType
): provision is MedicaidAmendmentProvisionType {
    return modifiedProvisionMedicaidAmendmentKeys.includes(
        provision as MedicaidAmendmentProvisionType
    )
}

export type {
    ModifiedProvisionsMedicaidAmendment,
    ModifiedProvisionsMedicaidBase,
    CHIPProvisionType,
    MedicaidBaseProvisionType,
    MedicaidAmendmentProvisionType,
    CHIPModifiedProvisions,
    GeneralizedProvisionType,
    GeneralizedModifiedProvisions,
}

export {
    modifiedProvisionMedicaidBaseKeys,
    modifiedProvisionMedicaidAmendmentKeys,
    provisionCHIPKeys,
    isCHIPProvision,
    isMedicaidAmendmentProvision,
    isMedicaidBaseProvision,
}
