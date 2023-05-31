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
    SharedRateCertDisplay,
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
    ModifiedProvisionsMedicaidAmendment,
    ModifiedProvisionsMedicaidBase,
    CHIPModifiedProvisions,
    CHIPProvisionType,
    GeneralizedProvisionType,
    MedicaidAmendmentProvisionType,
    MedicaidBaseProvisionType,
    GeneralizedModifiedProvisions,
} from './ModifiedProvisions'

export {
    federalAuthorityKeys,
    federalAuthorityKeysForCHIP,
} from './FederalAuthorities'

export {
    modifiedProvisionMedicaidBaseKeys,
    modifiedProvisionMedicaidAmendmentKeys,
    provisionCHIPKeys,
    isCHIPProvision,
    isMedicaidAmendmentProvision,
    isMedicaidBaseProvision,
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
    isSubmitted,
    programNames,
    packageName,
    generateRateName,
    convertRateSupportingDocs,
    removeInvalidProvisionsAndAuthorities,
    removeRatesData,
    hasValidPopulationCoverage,
    isValidAndCurrentLockedHealthPlanFormData,
    isContractWithProvisions,
    isCHIPOnly,
    isBaseContract,
    isContractAmendment,
} from './healthPlanFormData'

export type { HealthPlanFormDataType } from './HealthPlanFormDataType'
export type { ProgramArgType, StateType } from './State'

export { StateCodes, isValidStateCode } from './StateCodeType'
export type { StateCodeType } from './StateCodeType'
