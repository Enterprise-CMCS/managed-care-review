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

interface AmplifyError {
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

async function signUp(
    user: newUser
): Promise<CognitoUser | Error> {
  try {
    const response = await AmplifyAuth.signUp({
            username: user.username,
            password: user.password,
            attributes: {
                given_name: user.given_name,
                family_name: user.family_name,
                'custom:state_code': user.stateCode,
                'custom:role': 'macmcrrs-state-user',
            },
        })
        return response.user
    } catch (response) {
        if (isAmplifyError(response)) {
            if (response.code === 'UsernameExistsException') {
                console.info('that username already exists....')
            }
            if (response.code === 'NetworkError') {
                console.info(
                    'Failed to connect correctly to Amplify on Signup??'
                )
            }
        }
        return response
    }
}

async function confirmSignUp(
    email: string,
    code: string
): Promise<null | Error> {
    try {
        await AmplifyAuth.confirmSignUp(email, code)
        return null
    } catch (response) {
        if (isAmplifyError(response) && (response.code === 'ExpiredCodeException')) {
            console.info(
                'Your code is expired, amplify will send another one.'
            )
    }
    recordJSException(response)
    return response
    }
}

async function resendSignUp(
    email: string
): Promise<null | Error> {
   try {
    await AmplifyAuth.resendSignUp(email)
    return null
   } catch (response ) {
    recordJSException(response)
    return response
   }
}

async function signIn(
    email: string,
    password: string
): Promise<CognitoUser | Error> {
    try {
        const response = await AmplifyAuth.signIn(email, password)
        return response.user
    } catch (response) {
        if(isAmplifyError(response)) {
            if (response.code === 'UserNotConfirmedException') {
                recordJSException(
                    `AmplifyError ${response.code} – you need to confirm your account, enter the code below`
                )
            } else if (response.code === 'NotAuthorizedException') {
                recordJSException(`AmplifyError ${response.code} – this is probably a bad password`)
            } else if (response.code === 'UserNotFoundException') {
                recordJSException(`AmplifyError ${response.code} – user does not exist`)
            } else {
                recordJSException(`UNEXPECTED AmplifyError ${response.code} – ${response.message}`)
            }
        } else {
            recordJSException(`UNEXPECTED SIGNIN ERROR – 'didnt even get an amplify error back from login`)
        }
        return response
    }
}

async function signOut(): Promise<null | Error> {
   try {
    await AmplifyAuth.signOut()
    return null
    } catch (response) {
            recordJSException( response)
           return response
    }

}

async function extendSession(): Promise<null | Error> {
    try {
        await AmplifyAuth.currentSession()
        return null
    } catch (response) {
        recordJSException(response)
        return response
    }

}

export {
    extendSession,
    confirmSignUp,
    resendSignUp,
    signIn,
    signUp,
    signOut,
}

export type {
    AmplifyError,
    AmplifyErrorCodes
}
