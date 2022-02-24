type Submission2Status = 'DRAFT' | 'SUBMITTED' | 'UNLOCKED' | 'RESUBMITTED'

type Submission2Type = {
    id: string
    stateCode: string
    revisions: RevisionType[]
}

type UpdateInfoType = {
    updatedAt: Date
}

type RevisionType = {
    id: string
    unlockInfo?: UpdateInfoType
    submitInfo?: UpdateInfoType
    submissionFormProto: Uint8Array
}

export {
    Submission2Status,
    Submission2Type,
    UpdateInfoType,
    RevisionType,
}
