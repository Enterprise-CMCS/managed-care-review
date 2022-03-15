import { APIGatewayProxyHandler } from 'aws-lambda'
import axios from 'axios'

export const main: APIGatewayProxyHandler = async (event) => {
    const options = {
        headers: { 'content-type': 'application/json' },
    }

    await axios.post('localhost:55681/api/v1/trace', event.body, options)

    return {
        statusCode: 200,
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
