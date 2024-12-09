import {
    SubmissionType,
    RateType,
    ContractType,
    FederalAuthority,
    ManagedCareEntity,
    ActuarialFirmType,
    ActuaryCommunicationType,
    ContractExecutionStatus,
    PopulationCoveredType,
} from './healthPlanFormDataType'
import { HealthPlanPackageStatus } from './gen/gqlClient'

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

const RateTypeRecord: Record<RateType, string> = {
    NEW: 'Certification',
    AMENDMENT: 'Amendment',
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
}
