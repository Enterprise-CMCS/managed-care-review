import { getLoggedInUser } from '../localAuth'

import { fakeAmplifyFetch } from './fakeAmplifyFetch'

// localGQLfetch calls Amplify fetch but puts the user in the cognito header for
// the local Express server to map into the Lambda event
export async function localGQLFetch(
    uri: URL | RequestInfo,
    options?: RequestInit
): Promise<Response> {
    const currentUser = await getLoggedInUser()
    const opts: RequestInit = options ?? {}

    opts.headers = Object.assign({}, opts.headers, {
        'cognito-authentication-provider': currentUser
            ? JSON.stringify(currentUser)
            : 'NO_USER',
    })

    return fakeAmplifyFetch(uri, opts)
}
