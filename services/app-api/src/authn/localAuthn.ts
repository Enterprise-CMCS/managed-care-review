import type { UserType } from '../domain-models'
import type { Store } from '../postgres'
import { syncUserWithAurora } from './cognitoAuthn'

export async function userFromLocalAuthProvider(
    authProvider: string,
    store?: Store
): Promise<UserType | Error> {
    try {
        const localUser: UserType = JSON.parse(authProvider)

        if (store === undefined) {
            return localUser
        }

        return syncUserWithAurora(store, localUser)
    } catch (e) {
        console.error('ERROR: failed to parse local user from authProvider')
        return e instanceof Error ? e : new Error(String(e))
    }
}
