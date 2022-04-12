type HealthPlanPackageStatusType =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'UNLOCKED'
    | 'RESUBMITTED'

type HealthPlanPackageType = {
    id: string
    stateCode: string
    revisions: HealthPlanRevisionType[]
}

type UpdateInfoType = {
    updatedAt: Date
    updatedBy: string
    updatedReason: string
}

type HealthPlanRevisionType = {
    id: string
    unlockInfo?: UpdateInfoType
    submitInfo?: UpdateInfoType
    createdAt: Date
    submissionFormProto: Uint8Array
}

export {
    HealthPlanPackageStatusType,
    HealthPlanPackageType,
    UpdateInfoType,
    HealthPlanRevisionType,
}
