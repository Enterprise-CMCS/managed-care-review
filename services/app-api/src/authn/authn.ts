import { Result } from 'neverthrow'
import { UserType } from '../domain-models'
import { Store } from '../postgres'

export type userFromAuthProvider = (
    authProvider: string,
    store?: Store
) => Promise<Result<UserType, Error>>
