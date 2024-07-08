import type { Tracer } from '@opentelemetry/api'
import { trace } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

export function createTracer(serviceName: string): Tracer {
    const provider = new NodeTracerProvider({
        idGenerator: new AWSXRayIdGenerator(),
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
    })

    // log to console and send to New Relic
    const exporter = new OTLPTraceExporter({
        url: process.env.API_APP_OTEL_COLLECTOR_URL,
        headers: {},
    })

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

    // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
    provider.register({
        propagator: new AWSXRayPropagator(),
    })

    return trace.getTracer(serviceName)
}
