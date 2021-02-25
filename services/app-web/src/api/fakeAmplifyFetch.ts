import { API } from 'aws-amplify'
import { AxiosResponse } from 'axios'

// fakeAmplify Fetch looks like the API for fetch, but is secretly making an amplify request
// Apollo Link uses the ~fetch api for it's client-side middleware.
// Amplify.API uses axios undeneath and does its own transformation of the body, so we wrap that up here.
export async function fakeAmplifyFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	console.log('try to cogito', uri, options)

	if (options.method !== 'POST') {
		throw 'unexpected GQL request'
	}

	let amplifyBody = {}
	if (options.body && typeof options.body === 'string') {
		amplifyBody = JSON.parse(options.body)
	}

	// Amplify sets its own content-type and accept headers
	// if we try and override the content-type it breaks the signature, so we need to delete them.
	// This is ugly. There might be a cleverer way to do this with typescript but I'm not sure
	// options.headers is of type HeaderInit | string[][] | Record<string, string>
	const headers: { [header: string]: string } = Object.assign(
		{},
		options.headers
	) as { [header: string]: string }

	delete headers['accept']
	delete headers['content-type']

	const apiOptions = {
		response: true,
		body: amplifyBody,
		headers: headers,
	}

	return new Promise<Response>((resolve, reject) => {
		API.post('api', uri, apiOptions)
			.then((apiResponse: AxiosResponse) => {
				console.log('SUCCESS AT API: ', apiResponse)

				// The Apollo Link wants a fetch.Response shaped response,
				// not the axios shaped response that Amplify.API returns
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
						throw 'never call arrayBuffer'
					},

					clone: () => {
						throw 'never call clone'
					},
				}

				resolve(fakeFetchResponse)
			})
			.catch((e) => {
				console.log('Error at API', e)
				reject(e)
			})
	})
}
