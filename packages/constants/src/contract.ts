import {
    ConsolidatedContractStatus,
    ContractReviewStatus,
} from './gen/gqlClient'

const ReviewDecisionRecord: Record<
    Extract<ContractReviewStatus, 'NOT_SUBJECT_TO_REVIEW' | 'UNDER_REVIEW'>,
    string
> = {
    UNDER_REVIEW: 'Subject to review',
    NOT_SUBJECT_TO_REVIEW: 'Not subject to review',
}

const SubmissionReviewStatusRecord: Record<ContractReviewStatus, string> = {
    APPROVED: 'Approved',
    UNDER_REVIEW: 'Under review',
    WITHDRAWN: 'Withdrawn',
    NOT_SUBJECT_TO_REVIEW: ReviewDecisionRecord['NOT_SUBJECT_TO_REVIEW'],
}

const ConsolidatedContractStatusRecord: Record<
    ConsolidatedContractStatus,
    string
> = {
    DRAFT: 'Draft',
    UNLOCKED: 'Unlocked',
    SUBMITTED: 'Submitted',
    RESUBMITTED: 'Resubmitted',
    APPROVED: 'Approved',
    WITHDRAWN: 'Withdrawn',
    NOT_SUBJECT_TO_REVIEW: ReviewDecisionRecord['NOT_SUBJECT_TO_REVIEW'],
}

export {
    SubmissionReviewStatusRecord,
    ReviewDecisionRecord,
    ConsolidatedContractStatusRecord,
}
