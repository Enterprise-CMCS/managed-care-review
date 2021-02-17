import { Auth as AmplifyAuth } from 'aws-amplify'
import { CognitoUser } from 'amazon-cognito-identity-js'

import { Result, ok, err } from './result'

// This library wraps our calls to cognito
type newUser = {
    username: string
    password: string
    given_name: string
    family_name: string
}

type AmplifyErrorCodes =
    | 'UsernameExistsException'
    | 'ExpiredCodeException'
    | 'UserNotConfirmedException'
    | 'NotAuthorizedException'

export interface AmplifyError {
    code: AmplifyErrorCodes
    name: string
    message: string
}

// typescript user defined type assertion
function isAmplifyError(err: unknown): err is AmplifyError {
    const ampErr = err as AmplifyError
    return 'code' in ampErr && 'message' in ampErr && 'name' in ampErr
}

export async function signUp(
    user: newUser
): Promise<Result<CognitoUser, AmplifyError>> {
    try {
        const result = await AmplifyAuth.signUp({
            username: user.username,
            password: user.password,
            attributes: {
                given_name: user.given_name,
                family_name: user.family_name,
            },
        })
        return ok(result.user)
    } catch (e) {
        console.log('ERROR SIGNUP', e)

        if (isAmplifyError(e)) {
            if (e.code === 'UsernameExistsException') {
                console.log('that username already exists....')
                return err(e)
            } else {
                // if amplify returns an error in a format we don't expect, let's throw it for now.
                // might be against the spirit of never throw, but this is our boundary with a system we don't control.
                throw e
            }
        } else {
            throw e
        }
    }
}

export async function confirmSignUp(
    email: string,
    code: string
): Promise<Result<null, AmplifyError>> {
    try {
        await AmplifyAuth.confirmSignUp(email, code)
        return ok(null)
    } catch (e) {
        if (isAmplifyError(e)) {
            if (e.code === 'ExpiredCodeException') {
                console.log('your code is expired, we are sending another one.')
                return err(e)
            } else {
                throw e
            }
        } else {
            throw e
        }
    }
}

export async function resendSignUp(
    email: string
): Promise<Result<null, AmplifyError>> {
    try {
        await AmplifyAuth.resendSignUp(email)
        return ok(null)
    } catch (e) {
        // no known handleable errors for this one...
        console.log('unknonwnd err', e)
        throw e
    }
}

export async function signIn(
    email: string,
    password: string
): Promise<Result<CognitoUser, AmplifyError>> {
    try {
        const result = await AmplifyAuth.signIn(email, password)
        return ok(result.user)
    } catch (e) {
        if (isAmplifyError(e)) {
            if (e.code === 'UserNotConfirmedException') {
                console.log(
                    'you need to confirm your account, enter the code below'
                )
                return err(e)
            } else if (e.code === 'NotAuthorizedException') {
                console.log('unknown user or password?')
                return err(e)
            } else {
                // if amplify returns an error in a format we don't expect, let's throw it for now.
                // might be against the spirit of never throw, but this is our boundary with a system we don't control.
                throw e
            }
        } else {
            throw e
        }
    }
}

export async function signOut(): Promise<Result<null, Error>> {
    try {
        await AmplifyAuth.signOut()
        return ok(null)
    } catch (e) {
        console.log('error signing out: ', e)
        throw e
    }
}
