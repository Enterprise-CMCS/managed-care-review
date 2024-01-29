import type { Result } from 'neverthrow'
import { ok, err } from 'neverthrow'
import type { UserType } from '../domain-models/index'
import type { Store } from '../postgres'
import { lookupUserAurora } from './cognitoAuthn'

export async function userFromThirdPartyAuthorizer(
    store: Store,
    userId: string
): Promise<Result<UserType, Error | undefined>> {
    try {
        // Lookup user from postgres
        const auroraUser = await lookupUserAurora(store, userId)
        if (auroraUser instanceof Error) {
            return err(auroraUser)
        }

        if (auroraUser === undefined) {
            return err(auroraUser)
        }

        return ok(auroraUser)
    } catch (e) {
        console.error('ERROR: failed to look up user in postgres')
        return err(e)
    }
}
