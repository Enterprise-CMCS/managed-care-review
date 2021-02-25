import { getLoggedInUser } from '../pages/Auth/localLogin'

import { fakeAmplifyFetch } from './fakeAmplifyFetch'

export async function localGQLFetch(
    uri: string,
    options: RequestInit
): Promise<Response> {
    const currentUser = await getLoggedInUser()

    console.log('hed', options.headers)

    options.headers = Object.assign({}, options.headers, {
        'cognito-authentication-provider': JSON.stringify(currentUser),
    })

    return fakeAmplifyFetch(uri, options)
}
