type SubmissionDiffFieldChange = {
    fieldPath: string
    label: string
    oldValue: string | null
    newValue: string | null
}

type SubmissionDiffSection = {
    title: string
    changes: SubmissionDiffFieldChange[]
}

type SubmissionDiff = {
    contractID: string
    olderRevisionID: string
    newerRevisionID: string
    olderSubmittedAt: Date
    newerSubmittedAt: Date
    sections: SubmissionDiffSection[]
}

export type { SubmissionDiff, SubmissionDiffFieldChange, SubmissionDiffSection }
