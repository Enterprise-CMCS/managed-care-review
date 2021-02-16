import { getLoggedInUser } from '../pages/Auth/localLogin'

export async function localGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	console.log('try to LOCAL')

	const currentUser = await getLoggedInUser()

	options.headers = Object.assign({}, options.headers, {
		'cognito-authentication-provider': JSON.stringify(currentUser),
	})

	return fetch(uri, options)
}
