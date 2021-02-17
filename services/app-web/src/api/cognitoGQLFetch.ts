import { API, Cache } from 'aws-amplify'

export function cognitoGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	console.log('try to cogito', uri, options)

	console.log('CACHE OPTS', Cache.getAllKeys())

	if (options.method !== 'POST') {
		throw 'unexpected GQL request'
	}

	const apiOptions = {
		response: true,
		body: options.body,
	}

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
}
