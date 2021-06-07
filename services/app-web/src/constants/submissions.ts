import {
    SubmissionType,
    ContractType,
    FederalAuthority,
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

export { ContractTypeRecord, SubmissionTypeRecord, FederalAuthorityRecord }
