// TEMPORARY: these files are embedded in app-web for now b/c
// CRA prevents you from importing code outside of /src
// The fix is to use yarn workspaces to allow us to import shared packages
// Domain Types
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
    RateDataType,
} from './UnlockedHealthPlanFormDataType'

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
    packageName,
    generateRateName,
} from './healthPlanFormData'

export type { HealthPlanFormDataType } from './HealthPlanFormDataType'
