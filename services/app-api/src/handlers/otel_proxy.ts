import type { APIGatewayProxyHandler } from 'aws-lambda'
import axios from 'axios'

const main: APIGatewayProxyHandler = async (event) => {
    const ddApiKey = process.env.DD_API_KEY
    const ddOtelUrl = process.env.DD_OTEL_URL

    if (!ddApiKey || !ddOtelUrl) {
        console.error('DD_API_KEY or DD_OTEL_URL not configured')
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'OTEL proxy not configured' }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    const options = {
        headers: {
            'content-type': 'application/json',
            'dd-api-key': ddApiKey,
        },
    }

    try {
        await axios.post(ddOtelUrl, event.body, options)
    } catch (err) {
        console.error(
            `Could not send OTEL trace to Datadog: ${JSON.stringify(err)}`
        )
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

module.exports = { main }
