import { APIGatewayProxyHandler } from 'aws-lambda'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { Resource, ResourceAttributes } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import {
    SimpleSpanProcessor,
    ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base'

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
    const span: ResourceAttributes = JSON.parse(event.body)
    const provider = new NodeTracerProvider({
        resource: new Resource(span),
    })

    provider.addSpanProcessor(
        new SimpleSpanProcessor(new ConsoleSpanExporter())
    )
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
