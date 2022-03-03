import { CognitoUser } from 'amazon-cognito-identity-js'
import { Auth as AmplifyAuth } from 'aws-amplify'
import { StateUser } from '../../gen/gqlClient'

type newUser = {
    username: string
    password: string
    given_name: string
    family_name: string
    state_code: StateUser['state']['code']
}

type AmplifyErrorCodes =
    | 'UsernameExistsException'
    | 'ExpiredCodeException'
    | 'UserNotConfirmedException'
    | 'NotAuthorizedException'
    | 'UserNotFoundException'
    | 'NetworkError'
    | 'InvalidParameterException'

export interface AmplifyError {
    code: AmplifyErrorCodes
    name: string
    message: string
}

// typescript user defined type assertion
function isAmplifyError(err: unknown): err is AmplifyError {
    // const ampErr = err as AmplifyError
    if (err && typeof err === 'object') {
        return 'code' in err && 'message' in err && 'name' in err
    }
    return false
}

export function idmRedirectURL(): string {
    const authConfig = AmplifyAuth.configure()
    if (
        authConfig.oauth === undefined ||
        !('redirectSignIn' in authConfig.oauth)
    ) {
        throw new Error('Auth is not configured for IDM')
    }
    const { domain, redirectSignIn, responseType } = authConfig.oauth
    const clientId = authConfig.userPoolWebClientId
    const url = `https://${domain}/oauth2/authorize?identity_provider=Okta&redirect_uri=${redirectSignIn}&response_type=${responseType}&client_id=${clientId}`

    // https://undefined/oauth2/authorize?identity_provider=Okta&redirect_uri=undefined&response_type=token&client_id=6is5kleap6lljtidc0n77u1tr6

    return url
}

export async function signUp(
    user: newUser
): Promise<CognitoUser | AmplifyError> {
    try {
        const result = await AmplifyAuth.signUp({
            username: user.username,
            password: user.password,
            attributes: {
                given_name: user.given_name,
                family_name: user.family_name,
                'custom:state_code': user.state_code,
                'custom:role': 'macmcrrs-state-user',
            },
        })
        return result.user
    } catch (e) {
        console.log('ERROR SIGNUP', e)

        if (isAmplifyError(e)) {
            if (e.code === 'UsernameExistsException') {
                console.log('that username already exists....')
                return e
            } else if (e.code === 'NetworkError') {
                console.log(
                    'Failed to connect correctly to Amplify on Signup??'
                )
                return e
            } else {
                // if amplify returns an error in a format we don't expect, let's throw it for now.
                // might be against the spirit of never throw, but this is our boundary with a system we don't control.
                console.log('unexpected cognito error!')
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
): Promise<null | AmplifyError> {
    try {
        await AmplifyAuth.confirmSignUp(email, code)
        return null
    } catch (e) {
        if (isAmplifyError(e)) {
            if (e.code === 'ExpiredCodeException') {
                console.log('your code is expired, we are sending another one.')
                return e
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
): Promise<null | AmplifyError> {
    try {
        await AmplifyAuth.resendSignUp(email)
        return null
    } catch (e) {
        // no known handleable errors for this one...
        console.log('unknown err', e)
        throw e
    }
}

export async function signIn(
    email: string,
    password: string
): Promise<CognitoUser | AmplifyError> {
    try {
        const result = await AmplifyAuth.signIn(email, password)
        return result.user
    } catch (e) {
        if (isAmplifyError(e)) {
            if (e.code === 'UserNotConfirmedException') {
                console.log(
                    'you need to confirm your account, enter the code below'
                )
                return e
            } else if (e.code === 'NotAuthorizedException') {
                console.log('unknown user or password?')
                return e
            } else if (e.code === 'UserNotFoundException') {
                console.log('user does not exist')
                return e
            } else {
                // if amplify returns an error in a format we don't expect, let's throw it for now.
                // might be against the spirit of never throw, but this is our boundary with a system we don't control.
                throw e
            }
        } else {
            console.log('didnt even get an amplify error back from login')
            throw e
        }
    }
}

export async function signOut(): Promise<null> {
    try {
        await AmplifyAuth.signOut()
        console.log("amplify Singout Competle")
        return null
    } catch (e) {
        console.log('error signing out: ', e)
        throw e
    }
}
