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

				const fakeFetchResponse: Response = {
					headers: apiResponse.headers,
					status: apiResponse.status,
					ok: apiResponse.status >= 200 && apiResponse.status < 300,
					statusText: apiResponse.statusText,
					redirected: false,
					type: 'basic',
					url: apiResponse.request.url,
					// This is actually called by apollo-client
					trailer: new Promise<Headers>((resolve) => {
						// reject('fake trailer')
						console.log('FAKE TRAILER')
						resolve(apiResponse.headers)
					}),

					body: apiResponse.data,

					// this appears to actually be called by apollo-client and matter
					text: () => {
						return new Promise<string>((accept) => {
							console.log('FAK TEXT')
							accept(JSON.stringify(apiResponse.data))
						})
					},

					json: () => {
						return new Promise<string>((accept) => {
							console.log('FAKE JSON')
							accept(apiResponse.data)
						})
					},

					formData: () => {
						return new Promise<FormData>((accept) => {
							console.log('FAKE FORM DATA')
							accept(apiResponse.data)
						})
					},

					bodyUsed: false,
					blob: () => {
						throw 'never call blob'
					},
					arrayBuffer: () => {
						throw 'never call arraybug'
					},

					clone: () => {
						throw 'never call me'
					},
				}

				resolve(fakeFetchResponse)
			})
			.catch((e) => {
				console.log('Error at API')
				reject(e)
			})
	})

	// return fetch(uri, options)
}
