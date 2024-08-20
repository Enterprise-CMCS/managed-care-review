import { UnlockedHealthPlanFormDataType } from './UnlockedHealthPlanFormDataType'
import { LockedHealthPlanFormDataType } from './LockedHealthPlanFormDataType'

export type HealthPlanFormDataType =
    | UnlockedHealthPlanFormDataType
    | LockedHealthPlanFormDataType
