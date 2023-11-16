import { FederalAuthority } from './FederalAuthorities'
import { GeneralizedModifiedProvisions } from './ModifiedProvisions'

// Draft state submission is a health plan that a state user is still working on

type SubmissionType = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'

type PopulationCoveredType = 'MEDICAID' | 'CHIP' | 'MEDICAID_AND_CHIP'

type DocumentCategoryType =
    | 'CONTRACT'
    | 'RATES'
    | 'CONTRACT_RELATED'
    | 'RATES_RELATED'

type SubmissionDocument = {
    id?: string
    name: string
    s3URL: string
    sha256: string
    documentCategories: DocumentCategoryType[]
}

type ContractAmendmentInfo = {
    modifiedProvisions: GeneralizedModifiedProvisions
}

type UnlockedContractAmendmentInfo = {
    modifiedProvisions: Partial<GeneralizedModifiedProvisions>
}

type RateAmendmentInfo = {
    effectiveDateStart?: Date
    effectiveDateEnd?: Date
}

type ContractType = 'BASE' | 'AMENDMENT'

type ContractExecutionStatus = 'EXECUTED' | 'UNEXECUTED'

type ActuarialFirmType =
    | 'MERCER'
    | 'MILLIMAN'
    | 'OPTUMAS'
    | 'GUIDEHOUSE'
    | 'DELOITTE'
    | 'STATE_IN_HOUSE'
    | 'OTHER'

type ActuaryCommunicationType = 'OACT_TO_ACTUARY' | 'OACT_TO_STATE'

type StateContact = {
    name?: string
    titleRole?: string
    email?: string
}

type ActuaryContact = {
    id?: string
    name?: string
    titleRole?: string
    email?: string
    actuarialFirm?: ActuarialFirmType
    actuarialFirmOther?: string
}

type SharedRateCertDisplay = {
    packageId?: string
    packageName?: string
}

type RateType = 'NEW' | 'AMENDMENT'

type RateCapitationType = 'RATE_CELL' | 'RATE_RANGE'

type ManagedCareEntity = 'MCO' | 'PIHP' | 'PAHP' | 'PCCM'

type RateInfoType = {
    id?: string
    rateType?: RateType
    rateCapitationType?: RateCapitationType
    rateDocuments: SubmissionDocument[]
    supportingDocuments: SubmissionDocument[]
    rateDateStart?: Date
    rateDateEnd?: Date
    rateDateCertified?: Date
    rateAmendmentInfo?: RateAmendmentInfo
    rateProgramIDs?: string[]
    rateCertificationName?: string
    actuaryContacts: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunicationType
    packagesWithSharedRateCerts?: SharedRateCertDisplay[]
}

// MAIN
type UnlockedHealthPlanFormDataType = {
    id: string
    createdAt: Date
    updatedAt: Date
    status: 'DRAFT'
    stateCode: string
    stateNumber: number
    programIDs: string[]
    populationCovered?: PopulationCoveredType
    submissionType: SubmissionType
    riskBasedContract?: boolean
    submissionDescription: string
    stateContacts: StateContact[]
    addtlActuaryContacts: ActuaryContact[]
    addtlActuaryCommunicationPreference?: ActuaryCommunicationType
    documents: SubmissionDocument[]
    contractType?: ContractType
    contractExecutionStatus?: ContractExecutionStatus
    contractDocuments: SubmissionDocument[]
    contractDateStart?: Date
    contractDateEnd?: Date
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: UnlockedContractAmendmentInfo
    rateInfos: RateInfoType[]
    statutoryRegulatoryAttestation?: boolean
    statutoryRegulatoryAttestationDescription?: string
}

export type {
    DocumentCategoryType,
    SubmissionType,
    SubmissionDocument,
    RateType,
    StateContact,
    ActuaryContact,
    ActuarialFirmType,
    ActuaryCommunicationType,
    ContractType,
    ManagedCareEntity,
    UnlockedHealthPlanFormDataType,
    ContractAmendmentInfo,
    ContractExecutionStatus,
    RateCapitationType,
    RateInfoType,
    SharedRateCertDisplay,
    PopulationCoveredType,
}
