import {
    CHIPModifiedProvisions,
    ModifiedProvisionsMedicaidAmendment,
    ModifiedProvisionsMedicaidBase,
} from './healthPlanFormDataType/ModifiedProvisions'

const ModifiedProvisionsAmendmentRecord: Record<
    keyof ModifiedProvisionsMedicaidAmendment,
    string
> = {
    inLieuServicesAndSettings:
        'In Lieu-of Services and Settings (ILOSs) in accordance with 42 CFR § 438.3(e)(2)',
    modifiedBenefitsProvided: 'Benefits provided by the managed care plans',
    modifiedGeoAreaServed: 'Geographic areas served by the managed care plans',
    modifiedMedicaidBeneficiaries:
        'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)',
    modifiedRiskSharingStrategy:
        'Risk-sharing strategy (e.g., risk corridor, minimum medical loss ratio with a remittance, stop loss limits, reinsurance, etc.) in accordance with 42 CFR § 438.6(b)(1)',
    modifiedIncentiveArrangements:
        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)',
    modifiedWitholdAgreements:
        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)',
    modifiedStateDirectedPayments:
        'State directed payments in accordance with 42 CFR § 438.6(c)',
    modifiedPassThroughPayments:
        'Pass-through payments in accordance with 42 CFR § 438.6(d)',
    modifiedPaymentsForMentalDiseaseInstitutions:
        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)',
    modifiedMedicalLossRatioStandards:
        'Medical loss ratio standards in accordance with 42 CFR § 438.8',
    modifiedOtherFinancialPaymentIncentive:
        'Other financial, payment, incentive or related contractual provisions',
    modifiedEnrollmentProcess: 'Enrollment/disenrollment process',
    modifiedGrevienceAndAppeal: 'Grievance and appeal system',
    modifiedNetworkAdequacyStandards: 'Network adequacy standards',
    modifiedLengthOfContract: 'Length of the contract period',
    modifiedNonRiskPaymentArrangements:
        'Non-risk payment arrangements that do not exceed the upper payment limits specified in 42 CFR § 447.362',
}

const ModifiedProvisionsBaseContractRecord: Record<
    keyof ModifiedProvisionsMedicaidBase,
    string
> = {
    inLieuServicesAndSettings:
        'In Lieu-of Services and Settings (ILOSs) in accordance with 42 CFR § 438.3(e)(2)',
    modifiedRiskSharingStrategy:
        'Risk-sharing strategy (e.g., risk corridor, minimum medical loss ratio with a remittance, stop loss limits, reinsurance, etc.) in accordance with 42 CFR § 438.6(b)(1)',
    modifiedIncentiveArrangements:
        'Incentive arrangements in accordance with 42 CFR § 438.6(b)(2)',
    modifiedWitholdAgreements:
        'Withhold arrangements in accordance with 42 CFR § 438.6(b)(3)',
    modifiedStateDirectedPayments:
        'State directed payments in accordance with 42 CFR § 438.6(c)',
    modifiedPassThroughPayments:
        'Pass-through payments in accordance with 42 CFR § 438.6(d)',
    modifiedPaymentsForMentalDiseaseInstitutions:
        'Payments to MCOs and PIHPs for enrollees that are a patient in an institution for mental disease in accordance with 42 CFR § 438.6(e)',
    modifiedNonRiskPaymentArrangements:
        'Non-risk payment arrangements that do not exceed the upper payment limits specified in 42 CFR § 447.362',
}

const ModifiedProvisionsCHIPRecord: Record<
    keyof CHIPModifiedProvisions,
    string
> = {
    modifiedBenefitsProvided: 'Benefits provided by the managed care plans',
    modifiedGeoAreaServed: 'Geographic areas served by the managed care plans',
    modifiedMedicaidBeneficiaries:
        'CHIP beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)',
    modifiedMedicalLossRatioStandards:
        'Medical loss ratio standards in accordance with 42 CFR § 457. 1203',
    modifiedEnrollmentProcess:
        'Enrollment/disenrollment process 42 CFR § 457.1210 and 457.1212',
    modifiedGrevienceAndAppeal: 'Grievance and appeal system 42 CFR § 457.1260',
    modifiedNetworkAdequacyStandards:
        'Network adequacy standards 42 CFR § 457.1218',
    modifiedLengthOfContract: 'Length of the contract period',
    modifiedNonRiskPaymentArrangements:
        'Non-risk payment arrangements 42 CFR 457.10 and 457.1201(c)',
}

export {
    ModifiedProvisionsCHIPRecord,
    ModifiedProvisionsBaseContractRecord,
    ModifiedProvisionsAmendmentRecord,
}
