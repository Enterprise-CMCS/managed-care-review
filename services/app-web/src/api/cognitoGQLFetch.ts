import { Cache, API } from 'aws-amplify'
import { AxiosResponse } from 'axios'

export async function cognitoGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	console.log('try to cogito', uri, options)

	console.log('CACHE OPTS', Cache.getAllKeys())

	if (options.method !== 'POST') {
		throw 'unexpected GQL request'
	}

	// try {
	// 	const sesh = await Auth.currentSession()
	// 	// console.log('COGUSER', cogUser)
	// 	// const sesh = await cogUser.getSession()
	// 	console.log('COGSEHS', sesh)

	// 	const token = sesh.getIdToken().getJwtToken()
	// 	const otherToken = sesh.getAccessToken().getJwtToken()
	// 	console.log('IDTOKEN!!!', token)
	// 	console.log('AccessTOKEN!!!', otherToken)

	// 	options.headers = Object.assign({}, options.headers, {
	// 		Authorization: otherToken,
	// 	})

	// 	return fetch(uri, options)
	// } catch (e) {
	// 	console.log('CURRENT USER COG ERR', e)
	// 	throw e
	// }

	const apiOptions = {
		response: true,
		body: options.body,
	}

	return new Promise<Response>((resolve, reject) => {
		API.post('api', uri, apiOptions)
			.then((apiResponse: AxiosResponse) => {
				console.log('SUCCESS AT API: ', apiResponse)

				const fakeFetchResponse: Response = {
					headers: apiResponse.headers,
					status: apiResponse.status,
					ok: apiResponse.status >= 200 && apiResponse.status < 300,
					statusText: apiResponse.statusText,
					redirected: false,
					type: 'basic',
					url: apiResponse.request.url,
					trailer: new Promise<Headers>((_resolve, reject) =>
						reject('fake trailer')
					),

					body: apiResponse.data,

					text: () => {
						return new Promise<string>((accept) => {
							console.log('FAK TEXT')
							accept(apiResponse.data)
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
}
