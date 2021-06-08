import { DraftSubmission } from '../../gen/gqlClient'
const isContractOnly = (sub: DraftSubmission): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (sub: DraftSubmission): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

export { isContractOnly, isContractAndRates }
