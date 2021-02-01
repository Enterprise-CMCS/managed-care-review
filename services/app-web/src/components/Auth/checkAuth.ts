import axios from 'axios'

export async function checkAuth(): Promise<boolean> {

	const helloURL = process.env.REACT_APP_API_URL + '/hello'

	try {
		const result = await axios.get(helloURL)
		console.log(result)

		return true
	} catch (e) {
		console.log("axios Failed", e)

		return false
	}

}