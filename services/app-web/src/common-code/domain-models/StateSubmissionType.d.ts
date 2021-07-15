// StateSubmission is a health plan that has been submitted to CMS.

export type StateSubmissionType = {
    submittedAt: Date
    id: string
    status: 'SUBMITTED'
    stateCode: string
    stateNumber: number
    programID: string
    submissionDescription: string
    submissionType: SubmissionType
    createdAt: Date
    updatedAt: DateTime
    documents: SubmissionDocument[]
    contractType: ContractType
    contractDateStart: Date
    contractDateEnd: Date
    managedCareEntities: string[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: ContractAmendmentInfo
    rateType?: RateType
    rateDateStart?: Date
    rateDateEnd?: Date
    rateDateCertified?: Date
    rateAmendmentInfo?: RateAmendmentInfo
    stateContactName: string
    stateContactTitleRole: string
    stateContactEmail: string
    stateContactPhone: string
}
