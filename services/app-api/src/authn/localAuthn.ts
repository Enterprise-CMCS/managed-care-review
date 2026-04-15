import type { UserType } from '../domain-models'
import type { Store } from '../postgres'
import {
    lookupUserAurora,
    syncUserWithAurora,
    wasUpdatedToday,
} from './cognitoAuthn'
import { parseErrorToError } from '@mc-review/helpers'

export async function userFromLocalAuthProvider(
    authProvider: string,
    store?: Store
): Promise<UserType | Error> {
    try {
        const localUser: UserType = JSON.parse(authProvider)

        if (store === undefined) {
            return localUser
        }

        const dbUser = await lookupUserAurora(store, localUser.id)

        if (dbUser instanceof Error) {
            return localUser
        }

        // Mimics the logic for syncing cognito user
        if (!dbUser || !wasUpdatedToday(dbUser.updatedAt)) {
            return syncUserWithAurora(store, localUser, dbUser)
        }

        return dbUser
    } catch (e) {
        console.error('ERROR: failed to parse local user from authProvider')
        return parseErrorToError(e)
    }
}
