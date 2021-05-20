// DraftSubmission is a draft submission.

export type SubmissionType = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'
export type SubmissionDocument = {
    name: string
    s3URL: string
}

export type DraftSubmissionType = {
    id: string
    stateCode: string
    stateNumber: number
    programID: string
    submissionDescription: string
    submissionType: SubmissionType
    createdAt: Date
    updatedAt: Date
    documents: SubmissionDocument[]
}
