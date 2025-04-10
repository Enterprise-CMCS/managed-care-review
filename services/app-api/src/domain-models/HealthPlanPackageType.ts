import type { IndexContractQuestionsPayload } from './QuestionsType'
import type { UpdateInfoType } from './contractAndRates'

type HealthPlanPackageStatusType =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'UNLOCKED'
    | 'RESUBMITTED'

type HealthPlanPackageType = {
    id: string
    stateCode: string
    mccrsID?: string
    revisions: HealthPlanRevisionType[]
    questions?: IndexContractQuestionsPayload
}

type HealthPlanRevisionType = {
    id: string
    unlockInfo?: UpdateInfoType
    submitInfo?: UpdateInfoType
    createdAt: Date
    formDataProto: Uint8Array
}

export type {
    HealthPlanPackageStatusType,
    HealthPlanPackageType,
    UpdateInfoType,
    HealthPlanRevisionType,
}
