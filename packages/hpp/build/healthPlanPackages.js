const SubmissionTypeRecord = {
    CONTRACT_ONLY: 'Contract action only',
    CONTRACT_AND_RATES: 'Contract action and rate certification',
};
const PopulationCoveredRecord = {
    MEDICAID: 'Medicaid',
    CHIP: 'CHIP-only',
    MEDICAID_AND_CHIP: 'Medicaid and CHIP',
};
const ContractTypeRecord = {
    BASE: 'Base contract',
    AMENDMENT: 'Contract amendment',
};
const RateTypeRecord = {
    NEW: 'Certification',
    AMENDMENT: 'Amendment',
};
const ContractExecutionStatusRecord = {
    EXECUTED: 'Fully executed',
    UNEXECUTED: 'Unexecuted by some or all parties',
};
const FederalAuthorityRecord = {
    STATE_PLAN: '1932(a) State Plan Authority',
    WAIVER_1915B: '1915(b) Waiver Authority',
    WAIVER_1115: '1115 Waiver Authority',
    VOLUNTARY: '1915(a) Voluntary Authority',
    BENCHMARK: '1937 Benchmark Authority',
    TITLE_XXI: 'Title XXI Separate CHIP State Plan Authority',
};
const ManagedCareEntityRecord = {
    MCO: 'Managed Care Organization (MCO)',
    PIHP: 'Prepaid Inpatient Health Plan (PIHP)',
    PAHP: 'Prepaid Ambulatory Health Plans (PAHP)',
    PCCM: 'Primary Care Case Management Entity (PCCM Entity)',
};
const ActuaryFirmsRecord = {
    MERCER: 'Mercer',
    MILLIMAN: 'Milliman',
    OPTUMAS: 'Optumas',
    GUIDEHOUSE: 'Guidehouse',
    DELOITTE: 'Deloitte',
    STATE_IN_HOUSE: 'State in-house',
    OTHER: 'Other',
};
const ActuaryCommunicationRecord = {
    OACT_TO_ACTUARY: `OACT can communicate directly with the state’s actuaries but should copy the state on all written communication and all appointments for verbal discussions.`,
    OACT_TO_STATE: `OACT can communicate directly with the state, and the state will relay all written communication to their actuaries and set up time for any potential verbal discussions.`,
};
const SubmissionStatusRecord = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    UNLOCKED: 'Unlocked',
    RESUBMITTED: 'Resubmitted',
};
export { RateTypeRecord, ContractTypeRecord, SubmissionTypeRecord, FederalAuthorityRecord, ManagedCareEntityRecord, ActuaryFirmsRecord, ActuaryCommunicationRecord, ContractExecutionStatusRecord, SubmissionStatusRecord, PopulationCoveredRecord, };
//# sourceMappingURL=healthPlanPackages.js.map