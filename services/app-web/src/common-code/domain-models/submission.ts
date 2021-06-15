import { DraftSubmissionType } from './DraftSubmissionType'
import { StateSubmissionType } from './StateSubmissionType'

const isContractOnly = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_ONLY'

const isContractAndRates = (sub: DraftSubmissionType): boolean =>
    sub.submissionType === 'CONTRACT_AND_RATES'

const isStateSubmission = (
    sub: DraftSubmissionType | Record<string, unknown>
): sub is StateSubmissionType =>
    sub.contractType !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.contractDateStart !== undefined &&
    sub.contractDateEnd !== undefined &&
    sub.documents !== [] &&
    sub.managedCareEntities !== [] &&
    sub.federalAuthorities !== []

export { isContractOnly, isContractAndRates, isStateSubmission }
