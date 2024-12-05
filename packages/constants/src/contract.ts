import { ReviewStatus } from './gen/gqlClient'

const SubmissionReviewStatusRecord: Record<ReviewStatus, string> = {
    APPROVED: 'Approved',
    UNDER_REVIEW: 'Under review',
}

export { SubmissionReviewStatusRecord }
