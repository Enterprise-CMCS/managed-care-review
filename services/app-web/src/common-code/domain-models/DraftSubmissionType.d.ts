// GQL SCHEMA MATCHED TYPES
type SubmissionType = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'
type SubmissionDocument = {
    name: string
    s3URL: string
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
const ENTITIES = ['MCO', 'PIHIP', 'PAHP', 'PCCM'] as const
type ManagedCareEntity = typeof ENTITIES[number]

// MAIN
type DraftSubmissionType = {
    id: string
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
}

export type {
    SubmissionType,
    SubmissionDocument,
    ContractType,
    FederalAuthority,
    ManagedCareEntity,
    DraftSubmissionType,
}
