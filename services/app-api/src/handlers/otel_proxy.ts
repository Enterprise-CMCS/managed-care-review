import type { APIGatewayProxyHandler } from 'aws-lambda'
import axios from 'axios'
import { parseErrorToError } from '@mc-review/helpers'

const COLLECTOR_URL = 'http://localhost:4318/v1/traces'

const main: APIGatewayProxyHandler = async (event) => {
    const bodyBytes = event.body?.length ?? 0
    console.info(
        `otel_proxy: received trace payload, body=${bodyBytes} bytes, isBase64=${event.isBase64Encoded}`
    )

    const options = {
        headers: { 'content-type': 'application/json' },
    }

    try {
        const response = await axios.post(COLLECTOR_URL, event.body, options)
        console.info(
            `otel_proxy: forwarded to collector, status=${response.status}`
        )
    } catch (err) {
        const parsed = parseErrorToError(err)
        const axiosErr = err as {
            response?: { status: number; data: unknown }
            code?: string
        }
        console.error('otel_proxy: failed to forward to collector', {
            message: parsed.message,
            collectorUrl: COLLECTOR_URL,
            httpStatus: axiosErr.response?.status,
            responseData: axiosErr.response?.data,
            code: axiosErr.code,
        })
        return {
            statusCode: 500,
            body: JSON.stringify(parsed.message),
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

export { main }
