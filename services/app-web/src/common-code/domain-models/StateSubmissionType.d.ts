import { DraftSubmissionType } from './DraftSubmissionType'

// StateSubmission is a health plan that has been submitted to CMS.

export type StateSubmissionType = {
    submittedAt: Date
} & DraftSubmissionType
