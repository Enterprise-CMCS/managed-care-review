import { getLoggedInUser } from '../pages/Auth/localLogin'

import { fakeAmplifyFetch } from './fakeAmplifyFetch'

// localGQLfetch calls Amplify fetch but puts the user in the cognito header for
// serverless-offline to set
export async function localGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	const currentUser = await getLoggedInUser()

	options.headers = Object.assign({}, options.headers, {
		'cognito-authentication-provider': currentUser
			? JSON.stringify(currentUser)
			: 'NO_USER',
	})

	return fakeAmplifyFetch(uri, options)
}
