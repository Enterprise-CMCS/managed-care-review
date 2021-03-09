// TEMPORARY: these files are embedded in app-web for now b/c
// CRA prevents you from importing code outside of /src
// The fix is to use yarn workspaces to allow us to import shared packages

export type { UserType, StateCode } from './user'
export { isUser } from './user'

export type { AuthModeType } from './config'
export { assertIsAuthMode } from './config'
