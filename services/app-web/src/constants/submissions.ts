import {
    SubmissionType,
    ContractType,
    FederalAuthority,
    ManagedCareEntity,
    AmendableItems,
    ActuarialFirmType,
    ActuaryCommunicationType,
    ContractExecutionStatus
} from '../common-code/domain-models/DraftSubmissionType'
import {
    Submission2Status
} from '../common-code/domain-models/Submission2Type'


const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

const ContractTypeRecord: Record<ContractType, string> = {
    BASE: 'Base contract',
    AMENDMENT: 'Contract amendment',
}

const ContractExecutionStatusRecord: Record<ContractExecutionStatus, string> = {
    EXECUTED: 'Fully executed',
    UNEXECUTED: 'Unexecuted by some or all parties'
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

const AmendableItemsRecord: Record<AmendableItems, string> = {
    BENEFITS_PROVIDED: 'Benefits provided',
    CAPITATION_RATES: 'Capitation rates',
    ENCOUNTER_DATA: 'Encounter data',
    ENROLLE_ACCESS: 'Enrollee access',
    ENROLLMENT_PROCESS: 'Enrollment/disenrollment process',
    FINANCIAL_INCENTIVES: 'Financial incentives',
    GEO_AREA_SERVED: 'Geographic area served',
    GRIEVANCES_AND_APPEALS_SYSTEM: 'Grievances and appeals system',
    LENGTH_OF_CONTRACT_PERIOD: 'Length of contract period',
    NON_RISK_PAYMENT: 'Non-risk payment',
    PROGRAM_INTEGRITY: 'Program integrity',
    QUALITY_STANDARDS: 'Quality standards',
    RISK_SHARING_MECHANISM: 'Risk sharing mechanisms',
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
    OACT_TO_ACTUARY: `The CMS Office of the Actuary can communicate directly with the state’s actuary
but should copy the state on all written communication
and all appointments for verbal discussions.`,
    OACT_TO_STATE: `The CMS Office of the Actuary can communicate directly with the state, and the
state will relay all written communication to their actuary
and set up time for any potential verbal discussions.`,
}

const RateChangeReasonRecord: Record<'ANNUAL' | 'MIDYEAR' | 'OTHER', string> = {
    ANNUAL: 'Annual rate update',
    MIDYEAR: 'Mid-year update',
    OTHER: 'Other (please describe)',
}

const SubmissionStatusRecord: Record<Submission2Status, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNLOCKED: 'Unlocked',
    RESUBMITTED: 'Resubmitted'
}

export {
    RateChangeReasonRecord,
    AmendableItemsRecord,
    ContractTypeRecord,
    SubmissionTypeRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
    ContractExecutionStatusRecord,
    SubmissionStatusRecord,
}
