import {
    FederalAuthority
} from './FederalAuthorities'
import {
    HealthPlanPackageStatus,
    RateMedicaidPopulations,
    SubmissionType,
    PopulationCoveredType,
    ContractType,
    RateAmendmentType,
    ContractExecutionStatus,
    ManagedCareEntity,
    ActuarialFirm,
    ActuaryCommunication,
} from '../gen/gqlClient'
import {
    CHIPModifiedProvisions,
    ModifiedProvisionsMedicaidAmendment,
    ModifiedProvisionsMedicaidBase,
} from './ModifiedProvisions'

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

const PopulationCoveredRecord: Record<PopulationCoveredType, string> = {
    MEDICAID: 'Medicaid',
    CHIP: 'CHIP-only',
    MEDICAID_AND_CHIP: 'Medicaid and CHIP',
}

const ContractTypeRecord: Record<ContractType, string> = {
    BASE: 'Base contract',
    AMENDMENT: 'Contract amendment',
}

const RateTypeRecord: Record<RateAmendmentType, string> = {
    NEW: 'Certification',
    AMENDMENT: 'Amendment',
}

const RateMedicaidPopulationsRecord: Record<RateMedicaidPopulations, string> = {
    MEDICARE_MEDICAID_WITH_DSNP: 'Medicare-Medicaid dual eligibles enrolled through a D-SNP',
    MEDICAID_ONLY: 'Medicaid-only',
    MEDICARE_MEDICAID_WITHOUT_DSNP: `Medicare-Medicaid dual eligibles not enrolled through a D-SNP`
}
const ContractExecutionStatusRecord: Record<ContractExecutionStatus, string> = {
    EXECUTED: 'Fully executed',
    UNEXECUTED: 'Unexecuted by some or all parties',
}

const FederalAuthorityRecord: Record<FederalAuthority, string> = {
    STATE_PLAN: '1932(a) State Plan Authority',
    WAIVER_1915B: '1915(b) Waiver Authority',
    WAIVER_1115: '1115 Waiver Authority',
    VOLUNTARY: '1915(a) Voluntary Authority',
    BENCHMARK: '1937 Benchmark Authority',
    TITLE_XXI: 'Title XXI Separate CHIP State Plan Authority',
}
const ManagedCareEntityRecord: Record<ManagedCareEntity, string> = {
    MCO: 'Managed Care Organization (MCO)',
    PIHP: 'Prepaid Inpatient Health Plan (PIHP)',
    PAHP: 'Prepaid Ambulatory Health Plans (PAHP)',
    PCCM: 'Primary Care Case Management Entity (PCCM Entity)',
}

const ActuaryFirmsRecord: Record<ActuarialFirm, string> = {
    MERCER: 'Mercer',
    MILLIMAN: 'Milliman',
    OPTUMAS: 'Optumas',
    GUIDEHOUSE: 'Guidehouse',
    DELOITTE: 'Deloitte',
    STATE_IN_HOUSE: 'State in-house',
    OTHER: 'Other',
}

const ActuaryCommunicationRecord: Record<ActuaryCommunication, string> = {
    OACT_TO_ACTUARY: `OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.`,
    OACT_TO_STATE: `OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.`,
}

const SubmissionStatusRecord: Record<HealthPlanPackageStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNLOCKED: 'Unlocked',
    RESUBMITTED: 'Resubmitted',
}

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

// The `dsnpContract` field is required when a contract
// has any of the following Federal Authorities
const dsnpTriggers = [
    'STATE_PLAN',
    'WAIVER_1915B',
    'WAIVER_1115',
    'VOLUNTARY',
]

export {
    RateTypeRecord,
    ContractTypeRecord,
    SubmissionTypeRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
    ContractExecutionStatusRecord,
    SubmissionStatusRecord,
    PopulationCoveredRecord,
    RateMedicaidPopulationsRecord,
    ModifiedProvisionsCHIPRecord,
    ModifiedProvisionsBaseContractRecord,
    ModifiedProvisionsAmendmentRecord,
    dsnpTriggers
}
