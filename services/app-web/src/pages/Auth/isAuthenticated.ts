import { API } from "aws-amplify";

export async function isAuthenticated(): Promise<boolean> {

	const helloURL = process.env.REACT_APP_API_URL + '/hello'

	try {
		const result = await API.get('api', helloURL, {response: true})
		console.log(result)

		return true
	} catch (e) {
		console.log("axios Failed", e)

		return false
	}

}