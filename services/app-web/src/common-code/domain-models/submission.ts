import { DraftSubmissionType } from './DraftSubmissionType'
import { StateSubmissionType } from './StateSubmissionType'

const isContractOnly = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

const isStateSubmission = (
    sub: DraftSubmissionType | Record<string, unknown>
): sub is StateSubmissionType =>
    sub.contractType !== null &&
    sub.contractDateStart !== null &&
    sub.contractDateEnd !== null &&
    sub.contractDateStart !== null &&
    sub.contractDateEnd !== null

export { isContractOnly, isContractAndRates, isStateSubmission }
