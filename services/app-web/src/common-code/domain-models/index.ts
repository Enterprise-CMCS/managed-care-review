// TEMPORARY: these files are embedded in app-web for now b/c
// CRA prevents you from importing code outside of /src
// The fix is to use yarn workspaces to allow us to import shared packages
export type { AuthModeType } from './config'
export { assertIsAuthMode, assertNever } from './config'

// Domain Types
export type {
    CognitoUserType,
    CognitoStateUserType,
    CognitoCMSUserType
} from './cognitoUserType'

export type {
    DraftSubmissionType,
    SubmissionType,
    SubmissionDocument,
    RateType,
    ContractType,
    FederalAuthority,
    StateContact,
    ActuaryContact,
    ActuaryCommunicationType,
    ManagedCareEntity,
} from './DraftSubmissionType'

export type { StateSubmissionType } from './StateSubmissionType'

export type { SubmissionUnionType } from './SubmissionUnionType'

export type { ProgramT } from './ProgramT'

// Type checks and type guards
export { isCognitoUser } from './user'
export {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    isContractOnly,
    isContractAndRates,
    isStateSubmission,
    isDraftSubmission,
} from './submission'
