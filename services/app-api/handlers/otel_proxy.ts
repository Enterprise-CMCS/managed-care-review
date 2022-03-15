import { APIGatewayProxyHandler } from 'aws-lambda'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { Resource } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'

export const main: APIGatewayProxyHandler = async (event) => {
    if (event.body == null) {
        return {
            statusCode: 200,
            body: '{"error": "no span received. continuing."}',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }
    const span: Resource = JSON.parse(event.body)
    console.log(span) // eslint-disable-line no-console

    const provider = new NodeTracerProvider({
        resource: span,
    })

    provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter()))
    provider.register()

    return {
        statusCode: 200,
        body: '',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}
