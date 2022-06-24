// Draft state submission is a health plan that a state user is still working on

type SubmissionType = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'

type DocumentCategoryType =
    | 'CONTRACT'
    | 'RATES'
    | 'CONTRACT_RELATED'
    | 'RATES_RELATED'

type SubmissionDocument = {
    name: string
    s3URL: string
    documentCategories: DocumentCategoryType[]
}

type ContractAmendmentInfo = {
    modifiedProvisions: ModifiedProvisions
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

type FederalAuthority =
    | 'STATE_PLAN'
    | 'WAIVER_1915B'
    | 'WAIVER_1115'
    | 'VOLUNTARY'
    | 'BENCHMARK'
    | 'TITLE_XXI'

type StateContact = {
    name: string
    titleRole: string
    email: string
}

type ActuaryContact = {
    name: string
    titleRole: string
    email: string
    actuarialFirm?: ActuarialFirmType
    actuarialFirmOther?: string
}

type RateType = 'NEW' | 'AMENDMENT'

type RateCapitationType = 'RATE_CELL' | 'RATE_RANGE'

type ManagedCareEntity = 'MCO' | 'PIHP' | 'PAHP' | 'PCCM'

// MAIN
type UnlockedHealthPlanFormDataType = {
    id: string
    createdAt: Date
    updatedAt: Date
    status: 'DRAFT'
    stateCode: string
    stateNumber: number
    programIDs: string[]
    submissionType: SubmissionType
    submissionDescription: string
    stateContacts: StateContact[]
    actuaryContacts: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunicationType
    documents: SubmissionDocument[]
    contractType?: ContractType
    contractExecutionStatus?: ContractExecutionStatus
    contractDocuments: SubmissionDocument[]
    contractDateStart?: Date
    contractDateEnd?: Date
    managedCareEntities: string[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: ContractAmendmentInfo
    rateType?: RateType
    rateCapitationType?: RateCapitationType
    rateDocuments: SubmissionDocument[]
    rateDateStart?: Date
    rateDateEnd?: Date
    rateDateCertified?: Date
    rateAmendmentInfo?: RateAmendmentInfo
}

type RateDataType = {
    rateType?: 'AMENDMENT' | 'NEW' | null
    rateCapitationType?: RateCapitationType
    rateDateStart?: Date
    rateDateEnd?: Date
    rateDateCertified?: Date
    rateAmendmentInfo?: {
        effectiveDateEnd?: Date
        effectiveDateStart?: Date
    } | null
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
    FederalAuthority,
    ManagedCareEntity,
    UnlockedHealthPlanFormDataType,
    ContractAmendmentInfo,
    ContractExecutionStatus,
    RateDataType,
    RateCapitationType,
}
