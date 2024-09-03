import { CognitoUser } from 'amazon-cognito-identity-js'
import { Auth as AmplifyAuth } from 'aws-amplify'
import { StateUser } from '../../gen/gqlClient'
import { recordJSException } from '../../otelHelpers'

type newUser = {
    username: string
    password: string
    given_name: string
    family_name: string
    stateCode: StateUser['state']['code']
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
                'custom:state_code': user.stateCode,
                'custom:role': 'macmcrrs-state-user',
            },
        })
        return result.user
    } catch (e) {
        console.info('ERROR SIGNUP', e)

        if (isAmplifyError(e)) {
            if (e.code === 'UsernameExistsException') {
                console.info('that username already exists....')
                return e
            } else if (e.code === 'NetworkError') {
                console.info(
                    'Failed to connect correctly to Amplify on Signup??'
                )
                return e
            } else {
                // if amplify returns an error in a format we don't expect, let's throw it for now.
                // might be against the spirit of never throw, but this is our boundary with a system we don't control.
                console.info('unexpected cognito error!')
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
                console.info(
                    'your code is expired, we are sending another one.'
                )
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
        console.info('unknown err', e)
        throw e
    }
}

export async function signIn(
    email: string,
    password: string
): Promise<CognitoUser | Error> {
    try {
        const result = await AmplifyAuth.signIn(email, password)
        return result.user
    } catch (e) {
        if (isAmplifyError(e)) {
            if (e.code === 'UserNotConfirmedException') {
                recordJSException(
                    `AmplifyError ${e.code} – you need to confirm your account, enter the code below`
                )
            } else if (e.code === 'NotAuthorizedException') {
                recordJSException(`AmplifyError ${e.code} – this is probably a bad password`)
            } else if (e.code === 'UserNotFoundException') {
                recordJSException(`AmplifyError ${e.code} – user does not exist`)
            } else {
                recordJSException(`UNEXPECTED SIGNIN ERROR AmplifyError ${e.code} – ${e.message}`)
            }
        } else {
            recordJSException(`UNEXPECTED SIGNIN ERROR – 'didnt even get an amplify error back from login`)
        }
    }
    throw Error('Cognito SignIn error')
}

export async function signOut(): Promise<null> {
    try {
        await AmplifyAuth.signOut()
        return null
    } catch (e) {
        console.info('error signing out: ', e)
        throw e
    }
}

export async function extendSession(): Promise<null> {
    try {
        await AmplifyAuth.currentSession()
        return null
    } catch (e) {
        console.info('error extending session: ', e)
        throw e
    }
}
