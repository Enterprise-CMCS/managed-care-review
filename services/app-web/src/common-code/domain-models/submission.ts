import { DraftSubmissionType } from './DraftSubmissionType'
const isContractOnly = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

export { isContractOnly, isContractAndRates }
