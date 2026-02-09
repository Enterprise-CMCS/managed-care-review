import type { UserType } from '../domain-models'
import type { Store } from '../postgres'

export type userFromAuthProvider = (
    authProvider: string,
    store?: Store
) => Promise<UserType | Error>
