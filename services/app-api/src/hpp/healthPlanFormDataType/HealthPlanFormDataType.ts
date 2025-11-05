import type { UnlockedHealthPlanFormDataType } from './UnlockedHealthPlanFormDataType'
import type { LockedHealthPlanFormDataType } from './LockedHealthPlanFormDataType'

export type HealthPlanFormDataType =
    | UnlockedHealthPlanFormDataType
    | LockedHealthPlanFormDataType
