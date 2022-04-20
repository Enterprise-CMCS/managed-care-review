import { Result } from 'neverthrow'
import { CognitoUserType } from '../domain-models'

export type userFromAuthProvider = (
    authProvider: string
) => Promise<Result<CognitoUserType, Error>>
