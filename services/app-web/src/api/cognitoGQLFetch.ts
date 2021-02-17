import { Cache, Auth } from 'aws-amplify'

export async function cognitoGQLFetch(
	uri: string,
	options: RequestInit
): Promise<Response> {
	console.log('try to cogito', uri, options)

	console.log('CACHE OPTS', Cache.getAllKeys())

	if (options.method !== 'POST') {
		throw 'unexpected GQL request'
	}

	try {
		const sesh = await Auth.currentSession()
		// console.log('COGUSER', cogUser)
		// const sesh = await cogUser.getSession()
		console.log('COGSEHS', sesh)

		// const token = sesh.getIdToken().getJwtToken()
		const otherToken = sesh.getAccessToken().getJwtToken()

		console.log('TOKEN!!!', otherToken)

		options.headers = Object.assign({}, options.headers, {
			Authorization: otherToken,
		})

		return fetch(uri, options)
	} catch (e) {
		console.log('CURRENT USER COG ERR', e)
		throw e
	}

	// const apiOptions = {
	// 	response: true,
	// 	body: options.body,
	// }

	// return new Promise<Response>((resolve, reject) => {
	// 	API.post('api', uri, apiOptions)
	// 		.then((apiResponse) => {
	// 			console.log('SUCCESS AT API: ', apiResponse)
	// 			resolve(apiResponse)
	// 		})
	// 		.catch((e) => {
	// 			console.log('Error at API')
	// 			reject(e)
	// 		})
	// })
}
