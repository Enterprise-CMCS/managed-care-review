type GeneralizedProvisionType = CHIPProvisionType | MedicaidBaseProvisionType | MedicaidAmendmentProvisionType;
type GeneralizedModifiedProvisions = {
    [K in GeneralizedProvisionType]: boolean;
};
declare const provisionCHIPKeys: readonly ["modifiedBenefitsProvided", "modifiedGeoAreaServed", "modifiedMedicaidBeneficiaries", "modifiedEnrollmentProcess", "modifiedMedicalLossRatioStandards", "modifiedGrevienceAndAppeal", "modifiedNetworkAdequacyStandards", "modifiedLengthOfContract", "modifiedNonRiskPaymentArrangements"];
type CHIPProvisionType = (typeof provisionCHIPKeys)[number];
type CHIPModifiedProvisions = {
    [K in CHIPProvisionType]: boolean;
};
declare function isCHIPProvision(provision: CHIPProvisionType | GeneralizedProvisionType): provision is CHIPProvisionType;
declare const modifiedProvisionMedicaidBaseKeys: readonly ["inLieuServicesAndSettings", "modifiedRiskSharingStrategy", "modifiedIncentiveArrangements", "modifiedWitholdAgreements", "modifiedStateDirectedPayments", "modifiedPassThroughPayments", "modifiedPaymentsForMentalDiseaseInstitutions", "modifiedNonRiskPaymentArrangements"];
type MedicaidBaseProvisionType = (typeof modifiedProvisionMedicaidBaseKeys)[number];
type ModifiedProvisionsMedicaidBase = {
    [K in MedicaidBaseProvisionType]: boolean;
};
declare function isMedicaidBaseProvision(provision: MedicaidBaseProvisionType | GeneralizedProvisionType): provision is MedicaidBaseProvisionType;
declare const modifiedProvisionMedicaidAmendmentKeys: readonly ["inLieuServicesAndSettings", "modifiedBenefitsProvided", "modifiedGeoAreaServed", "modifiedMedicaidBeneficiaries", "modifiedRiskSharingStrategy", "modifiedIncentiveArrangements", "modifiedWitholdAgreements", "modifiedStateDirectedPayments", "modifiedPassThroughPayments", "modifiedPaymentsForMentalDiseaseInstitutions", "modifiedMedicalLossRatioStandards", "modifiedOtherFinancialPaymentIncentive", "modifiedEnrollmentProcess", "modifiedGrevienceAndAppeal", "modifiedNetworkAdequacyStandards", "modifiedLengthOfContract", "modifiedNonRiskPaymentArrangements"];
type MedicaidAmendmentProvisionType = (typeof modifiedProvisionMedicaidAmendmentKeys)[number];
type ModifiedProvisionsMedicaidAmendment = {
    [K in MedicaidAmendmentProvisionType]: boolean;
};
declare function isMedicaidAmendmentProvision(provision: MedicaidAmendmentProvisionType | GeneralizedProvisionType): provision is MedicaidAmendmentProvisionType;
export type { ModifiedProvisionsMedicaidAmendment, ModifiedProvisionsMedicaidBase, CHIPProvisionType, MedicaidBaseProvisionType, MedicaidAmendmentProvisionType, CHIPModifiedProvisions, GeneralizedProvisionType, GeneralizedModifiedProvisions, };
export { modifiedProvisionMedicaidBaseKeys, modifiedProvisionMedicaidAmendmentKeys, provisionCHIPKeys, isCHIPProvision, isMedicaidAmendmentProvision, isMedicaidBaseProvision, };
