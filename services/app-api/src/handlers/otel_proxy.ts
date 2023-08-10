import type { APIGatewayProxyHandler } from 'aws-lambda'
import axios from 'axios'

export const main: APIGatewayProxyHandler = async (event) => {
    const options = {
        headers: { 'content-type': 'application/json' },
    }

    try {
        await axios.post('http://localhost:4318/v1/traces', event.body, options)
    } catch (err) {
        console.error(`Could not send OTEL trace: ${JSON.stringify(err)}`)
        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    return {
        statusCode: 200,
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
