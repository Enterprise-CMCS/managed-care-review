import { Result } from 'neverthrow'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models'

export type userFromAuthProvider = (
    authProvider: string
) => Promise<Result<CognitoUserType, Error>>
