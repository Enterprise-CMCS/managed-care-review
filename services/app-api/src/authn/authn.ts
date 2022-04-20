import { Result } from 'neverthrow'
import { UserType } from '../domain-models'

export type userFromAuthProvider = (
    authProvider: string
) => Promise<Result<UserType, Error>>
