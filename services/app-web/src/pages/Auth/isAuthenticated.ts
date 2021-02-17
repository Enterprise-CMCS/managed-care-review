import { API } from 'aws-amplify'
import { getLoggedInUser } from '../Auth/localLogin'

// Temporary way to do local login
async function requestOptions() {
    const localLogin = process.env.REACT_APP_LOCAL_LOGIN === 'true'

    // the API.*() methods all take any, so I think it's OK to use any here.
    const options: any = { response: true } // eslint-disable-line @typescript-eslint/no-explicit-any

    if (localLogin) {
        // serverless offline passes the value of the cognito-identity-id into our lambdas as
        // requestContext.identity.cognitoIdentityId. This lets us set a user locally without involving Cognito.
        try {
            const currentUser = await getLoggedInUser()
            if (currentUser) {
                options['headers'] = {
                    'cognito-authentication-provider': JSON.stringify(
                        currentUser
                    ),
                }
            }

            return options
        } catch (e) {
            throw new Error('Bad logged in User\n' + e.message)
        }
    } else {
        return options
    }
}

export async function isAuthenticated(): Promise<boolean> {
    const helloURL = '/hello'

    try {
        // Amplify.API correctly sets the authentication headers after logging in with Cognito
        const opts = await requestOptions()
        await API.get('api', helloURL, opts)

        return true
    } catch (e) {
        console.log('axios Failed', e)

        return false
    }
}
