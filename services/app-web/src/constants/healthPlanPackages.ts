import {
    SubmissionType,
    ContractType,
    FederalAuthority,
    ManagedCareEntity,
    ActuarialFirmType,
    ActuaryCommunicationType,
    ContractExecutionStatus,
    ModifiedProvisions,
    PopulationCoveredType,
} from '../common-code/healthPlanFormDataType'
import { HealthPlanPackageStatus } from '../gen/gqlClient'

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

const ModifiedProvisionsRecord: Record<keyof ModifiedProvisions, string> = {
    modifiedBenefitsProvided: 'Benefits provided by the managed care plans',
    modifiedGeoAreaServed: 'Geographic areas served by the managed care plans',
    modifiedMedicaidBeneficiaries:
        'Medicaid beneficiaries served by the managed care plans (e.g. eligibility or enrollment criteria)',
    modifiedRiskSharingStrategy:
        'Risk-sharing strategy (e.g., risk corridor, minimum medical loss ratio with a remittance, stop loss limits, reinsurance, etc.in accordance with 42 CFR § 438.6(b)(1)',
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
    modifiedNonRiskPaymentArrangements: 'Non-risk payment arrangements',
}

const ActuaryFirmsRecord: Record<ActuarialFirmType, string> = {
    MERCER: 'Mercer',
    MILLIMAN: 'Milliman',
    OPTUMAS: 'Optumas',
    GUIDEHOUSE: 'Guidehouse',
    DELOITTE: 'Deloitte',
    STATE_IN_HOUSE: 'State in-house',
    OTHER: 'Other',
}

const ActuaryCommunicationRecord: Record<ActuaryCommunicationType, string> = {
    OACT_TO_ACTUARY: `OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.`,
    OACT_TO_STATE: `OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.`,
}

const SubmissionStatusRecord: Record<HealthPlanPackageStatus, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNLOCKED: 'Unlocked',
    RESUBMITTED: 'Resubmitted',
}

export {
    ContractTypeRecord,
    SubmissionTypeRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
    ModifiedProvisionsRecord,
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
    ContractExecutionStatusRecord,
    SubmissionStatusRecord,
    PopulationCoveredRecord,
}
