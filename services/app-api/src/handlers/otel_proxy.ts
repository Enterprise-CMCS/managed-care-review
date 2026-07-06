import type { APIGatewayProxyHandler } from 'aws-lambda'
import axios from 'axios'
import { parseErrorToError } from '@mc-review/helpers'

const DD_TRACES_URL = 'https://otlp.ddog-gov.com/v1/traces'

const main: APIGatewayProxyHandler = async (event) => {
    const bodyBytes = event.body?.length ?? 0
    const contentType = event.isBase64Encoded
        ? 'application/x-protobuf'
        : event.headers?.['content-type'] ||
          event.headers?.['Content-Type'] ||
          'application/json'

    console.info(
        `otel_proxy: received trace payload, body=${bodyBytes} bytes, content-type=${contentType}`
    )

    // Local dev sets OTEL_EXPORTER_OTLP_TRACES_ENDPOINT (in .envrc) to point
    // at the local Jaeger container's OTLP port. Deployed environments leave
    // it unset and forward directly to Datadog.
    const localEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
    const tracesUrl = localEndpoint ?? DD_TRACES_URL

    const headers: Record<string, string> = {
        'content-type': contentType,
    }
    if (!localEndpoint) {
        if (!process.env.DD_API_KEY) {
            console.error('otel_proxy: DD_API_KEY is not set')
            return {
                statusCode: 500,
                body: JSON.stringify('DD_API_KEY is required'),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            }
        }
        headers['dd-api-key'] = process.env.DD_API_KEY
        headers['dd-otlp-source'] = 'datadog'
        headers['dd-otel-span-mapping'] = '{span_name_as_resource_name: false}'
    }

    const options = { headers }

    const body = event.isBase64Encoded
        ? Buffer.from(event.body ?? '', 'base64')
        : event.body

    try {
        const response = await axios.post(tracesUrl, body, options)
        console.info(`otel_proxy: forwarded traces`, {
            url: tracesUrl,
            status: response.status,
            responseData: response.data,
        })
    } catch (err) {
        const parsed = parseErrorToError(err)
        const axiosErr = err as {
            response?: { status: number; data: unknown }
            code?: string
        }
        console.error('otel_proxy: failed to forward traces', {
            message: parsed.message,
            url: tracesUrl,
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
