// StateSubmission is a health plan that has been submitted to CMS.
import type {
    StateContact,
    ActuaryContact,
    FederalAuthority,
    SubmissionDocument,
    ContractAmendmentInfo,
    RateAmendmentInfo,
    ActuaryCommunicationType,
    SubmissionType,
    ContractType,
    RateType,
    ContractExecutionStatus,
    RateCapitationType,
    RateInfoType,
} from './UnlockedHealthPlanFormDataType'

export type LockedHealthPlanFormDataType = {
    submittedAt: Date
    id: string
    status: 'SUBMITTED'
    stateCode: string
    stateNumber: number
    programIDs: string[]
    submissionDescription: string
    submissionType: SubmissionType
    createdAt: Date
    updatedAt: DateTime
    documents: SubmissionDocument[]
    contractType: ContractType
    contractExecutionStatus: ContractExecutionStatus
    contractDocuments: SubmissionDocument[]
    contractDateStart: Date
    contractDateEnd: Date
    managedCareEntities: string[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: ContractAmendmentInfo
    rateInfos: RateInfoType[]
    rateType?: RateType
    rateCapitationType?: RateCapitationType
    rateDocuments: SubmissionDocument[]
    rateDateStart?: Date
    rateDateEnd?: Date
    rateDateCertified?: Date
    rateAmendmentInfo?: RateAmendmentInfo
    rateProgramIDs?: string[]
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    addtlActuaryCommunicationPreference?: ActuaryCommunicationType
}
