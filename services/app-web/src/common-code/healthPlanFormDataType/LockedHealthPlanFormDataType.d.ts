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
    CalendarDate,
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
    contractDateStart: CalendarDate
    contractDateEnd: CalendarDate
    managedCareEntities: string[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: ContractAmendmentInfo
    rateType?: RateType
    rateCapitationType?: RateCapitationType
    rateDocuments: SubmissionDocument[]
    rateDateStart?: CalendarDate
    rateDateEnd?: CalendarDate
    rateDateCertified?: CalendarDate
    rateAmendmentInfo?: RateAmendmentInfo
    rateProgramIDs?: string[]
    stateContacts: StateContact[]
    actuaryContacts: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunicationType
}
