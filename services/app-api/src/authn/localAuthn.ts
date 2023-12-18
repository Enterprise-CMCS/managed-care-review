import type { Result } from 'neverthrow'
import { ok, err } from 'neverthrow'
import type { UserType } from '../domain-models/index'
import type { Store, InsertUserArgsType } from '../postgres'
import { lookupUserAurora } from './cognitoAuthn'

export async function userFromLocalAuthProvider(
    authProvider: string,
    store?: Store
): Promise<Result<UserType, Error>> {
    try {
        const localUser: UserType = JSON.parse(authProvider)

        if (store === undefined) {
            return ok(localUser)
        }

        const auroraUser = await insertUserToLocalAurora(store, localUser)

        if (auroraUser instanceof Error) {
            return err(auroraUser)
        }

        return ok(auroraUser)
    } catch (e) {
        console.error('ERROR: failed to parse local user from authProvider')
        return err(e)
    }
}

export async function insertUserToLocalAurora(
    store: Store,
    localUser: UserType
): Promise<UserType | Error> {
    const auroraUser = await lookupUserAurora(store, localUser.id)

    if (auroraUser instanceof Error) {
        return auroraUser
    }

    if (auroraUser === undefined) {
        const userToInsert: InsertUserArgsType = {
            userID: localUser.id,
            role: localUser.role,
            givenName: localUser.givenName,
            familyName: localUser.familyName,
            email: localUser.email,
        }

        // if it is a state user, insert the state they are from
        if (localUser.role === 'STATE_USER') {
            userToInsert.stateCode = localUser.stateCode
        }

        const result = await store.insertUser(userToInsert)

        if (result instanceof Error) {
            console.error(`Could not insert user: ${JSON.stringify(result)}`)
            return localUser
        }
        return result
    }

    return auroraUser
}
