// TEMPORARY: these files are embedded in app-web for now b/c
// CRA prevents you from importing code outside of /src
// The fix is to use yarn workspaces to allow us to import shared packages
// Domain Types
export type {
    ActuarialFirmType,
    ActuaryCommunicationType,
    ActuaryContact,
    ContractAmendmentInfo,
    ContractExecutionStatus,
    ContractType,
    DocumentCategoryType,
    UnlockedHealthPlanFormDataType,
    ManagedCareEntity,
    RateType,
    RateCapitationType,
    StateContact,
    SubmissionDocument,
    SubmissionType,
    RateInfoType,
    PopulationCoveredType,
} from './UnlockedHealthPlanFormDataType'

export type {
    FederalAuthority,
    CHIPFederalAuthority,
} from './FederalAuthorities'

export type {
    ModifiedProvisions,
    CHIPModifiedProvisions,
    ProvisionType,
} from './ModifiedProvisions'

export {
    federalAuthorityKeys,
    federalAuthorityKeysForCHIP,
} from './FederalAuthorities'

export {
    modifiedProvisionKeys,
    allowedProvisionKeysForCHIP,
    isCHIPProvision,
} from './ModifiedProvisions'

export type { LockedHealthPlanFormDataType } from './LockedHealthPlanFormDataType'
export {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    hasAnyValidRateData,
    hasValidSupportingDocumentCategories,
    isContractAndRates,
    isContractOnly,
    isUnlockedHealthPlanFormData,
    isLockedHealthPlanFormData,
    programNames,
    packageName,
    generateRateName,
    convertRateSupportingDocs,
    removeNonCHIPData,
    removeRatesData,
    hasValidRateCertAssurance,
    hasValidPopulationCoverage,
} from './healthPlanFormData'

export type { HealthPlanFormDataType } from './HealthPlanFormDataType'
export type { ProgramArgType, StateType } from './State'

export { StateCodes, isValidStateCode } from './StateCodeType'
export type { StateCodeType } from './StateCodeType'
