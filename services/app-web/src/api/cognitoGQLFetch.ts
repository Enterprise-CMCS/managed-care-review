import { API } from 'aws-amplify'

export function cognitoGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	console.log('try to cogito')

	return API.post('api', uri, options)
}
