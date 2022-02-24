// TEMPORARY: these files are embedded in app-web for now b/c
// CRA prevents you from importing code outside of /src
// The fix is to use yarn workspaces to allow us to import shared packages
// Domain Types
export type {
    CognitoCMSUserType, CognitoStateUserType, CognitoUserType
} from './cognitoUserType'
export { assertIsAuthMode, assertNever } from './config'
export type { AuthModeType } from './config'
export type {
    ActuarialFirmType, ActuaryCommunicationType, ActuaryContact, CapitationRatesAmendedReason,
    ContractAmendmentInfo, ContractType, DocumentCategoryType,
    DraftSubmissionType, FederalAuthority, ManagedCareEntity, RateType, StateContact, SubmissionDocument, SubmissionType
} from './DraftSubmissionType'
export type { ProgramT } from './ProgramT'
export type { StateSubmissionType } from './StateSubmissionType'
export {
    hasValidContract,
    hasValidDocuments, hasValidRates, hasValidSupportingDocumentCategories, isContractAndRates, isContractOnly, isDraftSubmission, isStateSubmission, submissionName
} from './submission'
export { submissionCurrentRevision, submissionStatus, submissionSubmittedAt } from './submission2'
export type { Submission2Type, UpdateInfoType } from './Submission2Type'
export type { SubmissionUnionType } from './SubmissionUnionType'
// Type checks and type guards
export { isCMSUser, isCognitoUser, isStateUser } from './user'

