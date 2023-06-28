// StateSubmission is a health plan that has been submitted to CMS.
import type {
    StateContact,
    ActuaryContact,
    FederalAuthority,
    SubmissionDocument,
    ContractAmendmentInfo,
    ActuaryCommunicationType,
    SubmissionType,
    ContractType,
    ContractExecutionStatus,
    RateInfoType,
    PopulationCoveredType,
} from './UnlockedHealthPlanFormDataType'

export type LockedHealthPlanFormDataType = {
    submittedAt: Date
    id: string
    status: 'SUBMITTED'
    stateCode: string
    stateNumber: number
    programIDs: string[]
    submissionDescription: string
    riskBasedContract: boolean
    populationCovered?: PopulationCoveredType
    submissionType: SubmissionType
    createdAt: Date
    updatedAt: DateTime
    documents: SubmissionDocument[]
    contractType: ContractType
    contractExecutionStatus: ContractExecutionStatus
    contractDocuments: SubmissionDocument[]
    contractDateStart: Date
    contractDateEnd: Date
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: ContractAmendmentInfo
    rateInfos: RateInfoType[]
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    addtlActuaryCommunicationPreference?: ActuaryCommunicationType
}
