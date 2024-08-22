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
];
function isCHIPProvision(provision) {
    return provisionCHIPKeys.includes(provision);
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
];
function isMedicaidBaseProvision(provision) {
    return modifiedProvisionMedicaidBaseKeys.includes(provision);
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
];
function isMedicaidAmendmentProvision(provision) {
    return modifiedProvisionMedicaidAmendmentKeys.includes(provision);
}
export { modifiedProvisionMedicaidBaseKeys, modifiedProvisionMedicaidAmendmentKeys, provisionCHIPKeys, isCHIPProvision, isMedicaidAmendmentProvision, isMedicaidBaseProvision, };
//# sourceMappingURL=ModifiedProvisions.js.map