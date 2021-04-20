// TEMPORARY: these files are embedded in app-web for now b/c
// CRA prevents you from importing code outside of /src
// The fix is to use yarn workspaces to allow us to import shared packages
export type { AuthModeType } from './config'
export { assertIsAuthMode, assertNever } from './config'

export { isCognitoUser } from './user'
export type { CognitoUserType } from './cognitoUserType'

export type { DraftSubmissionType, SubmissionType, SubmissionDocument } from './DraftSubmissionType'

export type { ProgramT } from './ProgramT'
