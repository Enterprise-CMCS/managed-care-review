import type { Result } from 'neverthrow'
import type { UserType } from '../domain-models'
import type { Store } from '../postgres'

export type userFromAuthProvider = (
    authProvider: string,
    store?: Store
) => Promise<Result<UserType, Error>>
