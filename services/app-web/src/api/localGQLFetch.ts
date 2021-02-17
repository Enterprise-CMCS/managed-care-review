import { getLoggedInUser } from '../pages/Auth/localLogin'

export async function localGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	const currentUser = await getLoggedInUser()
	console.log('try to LOCAL', currentUser)

	options.headers = Object.assign({}, options.headers, {
		'cognito-authentication-provider': JSON.stringify(currentUser),
	})

	return fetch(uri, options)
}
