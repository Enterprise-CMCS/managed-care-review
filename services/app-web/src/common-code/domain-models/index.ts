// TEMPORARY: these files are embedded in app-web for now b/c
// CRA prevents you from importing code outside of /src
// The fix is to use yarn workspaces to allow us to import shared packages
// Domain Types
export type {
    CognitoCMSUserType,
    CognitoStateUserType,
    CognitoUserType,
} from './cognitoUserType'
export { assertIsAuthMode, assertNever } from './config'
export type { AuthModeType } from './config'
export type {
    ActuarialFirmType,
    ActuaryCommunicationType,
    ActuaryContact,
    CapitationRatesAmendedReason,
    ContractAmendmentInfo,
    ContractExecutionStatus,
    ContractType,
    DocumentCategoryType,
    AmendableItems,
    UnlockedHealthPlanFormDataType,
    FederalAuthority,
    ManagedCareEntity,
    RateType,
    StateContact,
    SubmissionDocument,
    SubmissionType,
} from './UnlockedHealthPlanFormDataType'
export type { ProgramT } from './ProgramT'
export type { LockedHealthPlanFormDataType } from './LockedHealthPlanFormDataType'
export {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    hasValidSupportingDocumentCategories,
    isContractAndRates,
    isContractOnly,
    isUnlockedHealthPlanFormData,
    isLockedHealthPlanFormData,
    programNames,
    submissionName,
} from './healthPlanFormData'
export {
    submissionCurrentRevision,
    submissionStatus,
    submissionSubmittedAt,
} from './submission2'
export type {
    RevisionType,
    Submission2Type,
    Submission2Status,
    UpdateInfoType,
} from './Submission2Type'
export type { HealthPlanFormDataType } from './HealthPlanFormDataType'
// Type checks and type guards
export { isCMSUser, isCognitoUser, isStateUser } from './user'
