import { Result } from 'neverthrow'
import { UserType } from '../../app-web/src/common-code/domain-models/user'

export type userFromAuthProvider = (
    authProvider: string
) => Promise<Result<UserType, Error>>
