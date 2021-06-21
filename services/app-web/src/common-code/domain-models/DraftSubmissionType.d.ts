// Draft state submission is a health plan that a state user is still working on

// GQL SCHEMA MATCHED TYPES
type SubmissionType = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'
type SubmissionDocument = {
    name: string
    s3URL: string
}

type ContractAmendmentInfo = {
    itemsBeingAmended: string[]
    otherItemBeingAmended?: string
    capitationRatesAmendedInfo?: {
        reason?: 'ANNUAL' | 'MIDYEAR' | 'OTHER'
        otherReason?: string
    }
    relatedToCovid19?: boolean
    relatedToVaccination?: boolean
}

type ContractType = BASE | AMENDMENT

type FederalAuthority =
    | STATE_PLAN
    | WAIVER_1915B
    | WAIVER_1115
    | VOLUNTARY
    | BENCHMARK
    | TITLE_XXI

// CLIENT_SIDE ONLY TYPES
const ENTITIES = ['MCO', 'PIHP', 'PAHP', 'PCCM'] as const
type ManagedCareEntity = typeof ENTITIES[number]

const AMENDABLE_ITEMS = [
    'BENEFITS_PROVIDED',
    'CAPITATION_RATES',
    'ENCOUNTER_DATA',
    'ENROLLE_ACCESS',
    'ENROLLMENT_PROCESS',
    'FINANCIAL_INCENTIVES',
    'GEO_AREA_SERVED',
    'GRIEVANCES_AND_APPEALS_SYSTEM',
    'LENGTH_OF_CONTRACT_PERIOD',
    'NON_RISK_PAYMENT',
    'PROGRAM_INTEGRITY',
    'QUALITY_STANDARDS',
    'RISK_SHARING_MECHANISM',
] as const
export type AmendableItems = typeof AMENDABLE_ITEMS[number]

// MAIN
type DraftSubmissionType = {
    id: string
    status: 'DRAFT'
    stateCode: string
    stateNumber: number
    programID: string
    submissionDescription: string
    submissionType: SubmissionType
    createdAt: Date
    updatedAt: DateTime
    documents: SubmissionDocument[]
    contractType?: ContractType
    contractDateStart?: Date
    contractDateEnd?: Date
    managedCareEntities: string[]
    federalAuthorities: FederalAuthority[]
    contractAmendmentInfo?: ContractAmendmentInfo
}

export type {
    SubmissionType,
    SubmissionDocument,
    ContractType,
    FederalAuthority,
    ManagedCareEntity,
    DraftSubmissionType,
    AmendableItems,
}
