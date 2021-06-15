// StateSubmission is a health plan that has been submitted to CMS.

export type StateSubmissionType = {
    submittedAt: Date
    id: string
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
}
