import type { APIGatewayProxyHandler } from 'aws-lambda'
import axios from 'axios'
import { parseErrorToError } from '@mc-review/helpers'

const DD_TRACES_URL = 'https://otlp.ddog-gov.com/v1/traces'

const main: APIGatewayProxyHandler = async (event) => {
    const bodyBytes = event.body?.length ?? 0
    const contentType =
        event.headers?.['content-type'] ||
        event.headers?.['Content-Type'] ||
        'application/json'

    console.info(
        `otel_proxy: received trace payload, body=${bodyBytes} bytes, content-type=${contentType}`
    )

    const options = {
        headers: {
            'content-type': contentType,
            'dd-api-key': process.env.DD_API_KEY ?? '',
            'dd-otlp-source': 'ddog-gov.com',
            'dd-otel-span-mapping': '{span_name_as_resource_name: false}',
        },
    }

    try {
        const response = await axios.post(DD_TRACES_URL, event.body, options)
        console.info(
            `otel_proxy: forwarded to datadog, status=${response.status}`
        )
    } catch (err) {
        const parsed = parseErrorToError(err)
        const axiosErr = err as {
            response?: { status: number; data: unknown }
            code?: string
        }
        console.error('otel_proxy: failed to forward to datadog', {
            message: parsed.message,
            url: DD_TRACES_URL,
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
