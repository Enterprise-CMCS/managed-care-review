import { Result, ok, err } from 'neverthrow'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models/index'

export async function userFromLocalAuthProvider(
    authProvider: string
): Promise<Result<CognitoUserType, Error>> {
    try {
        const localUser = JSON.parse(authProvider)
        return ok(localUser)
    } catch (e) {
        console.error('ERROR: failed to parse local user from authProvider')
        return err(e)
    }
}
