import { APIGatewayProxyHandler } from 'aws-lambda'
import axios from 'axios'

export const main: APIGatewayProxyHandler = async (event) => {
    const options = {
        headers: { 'content-type': 'application/json' },
    }

    await axios.post('http://localhost:4318/', event.body, options)

    return {
        statusCode: 200,
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
