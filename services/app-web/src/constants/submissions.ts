import {
    SubmissionType,
    ContractType,
    FederalAuthority,
    ManagedCareEntity,
    AmendableItems,
} from '../common-code/domain-models/DraftSubmissionType'

const SubmissionTypeRecord: Record<SubmissionType, string> = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
}

const ContractTypeRecord: Record<ContractType, string> = {
    BASE: 'Base contract',
    AMENDMENT: 'Contract amendment',
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

const RateChangeReasonRecord: Record<'ANNUAL' | 'MIDYEAR' | 'OTHER', string> = {
    ANNUAL: 'Annual rate update',
    MIDYEAR: 'Mid-year update',
    OTHER: 'Other (please describe)',
}

export {
    RateChangeReasonRecord,
    AmendableItemsRecord,
    ContractTypeRecord,
    SubmissionTypeRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
}
