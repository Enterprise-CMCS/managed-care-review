import { API } from 'aws-amplify'
import { getLoggedInUser } from '../pages/Auth/localLogin'

export async function localGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	const currentUser = await getLoggedInUser()
	console.log('try to LOCAL', currentUser)

	if (options.method !== 'POST') {
		throw 'unexpected GQL request'
	}

	const apiOptions = {
		response: true,
		body: options.body,
		headers: {
			'cognito-authentication-provider': JSON.stringify(currentUser),
		},
	}

	// options.headers = Object.assign({}, options.headers, {
	// 	'cognito-authentication-provider': JSON.stringify(currentUser),
	// })

	return new Promise<Response>((resolve, reject) => {
		API.post('api', uri, apiOptions)
			.then((apiResponse) => {
				console.log('SUCCESS AT API: ', apiResponse)
				resolve(apiResponse)
			})
			.catch((e) => {
				console.log('Error at API')
				reject(e)
			})
	})

	// return fetch(uri, options)
}
