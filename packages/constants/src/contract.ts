import { ContractReviewStatus } from './gen/gqlClient'

const SubmissionReviewStatusRecord: Record<ContractReviewStatus, string> = {
    APPROVED: 'Approved',
    UNDER_REVIEW: 'Under review',
    WITHDRAWN: 'Withdrawn',
    NOT_SUBJECT_TO_REVIEW: 'Not subject to review'
}

export { SubmissionReviewStatusRecord }
