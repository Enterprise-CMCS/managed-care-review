import { Result, ok, err } from 'neverthrow'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models/index'

export async function userFromLocalAuthProvider(
    authProvider: string
): Promise<Result<CognitoUserType, Error>> {
    // TODO: do another check to ensure that LOCAL_LOGIN has not been set in an AWS environment
    try {
        const localUser = JSON.parse(authProvider)
        return ok(localUser) 
    } catch (e) {
        return err(e)
    }
}
