import opentelemetry, { type Tracer } from '@opentelemetry/api'
import { trace } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import {
    SimpleSpanProcessor,
    BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

export function initTracer(serviceName: string, otelCollectorURL: string) {
    console.info('-----Setting OTEL instrumentation-----')

    const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    })

    const exporter = new OTLPTraceExporter({
        url: otelCollectorURL,
        headers: {},
    })
    const provider = new NodeTracerProvider({
        idGenerator: new AWSXRayIdGenerator(),
        resource: resource,
        spanProcessors: [new BatchSpanProcessor(exporter)],
    })

    provider.register()
}

export function recordException(
    error: string | Error,
    serviceName: string,
    spanName: string
) {
    const tracer = opentelemetry.trace.getTracer(serviceName)
    const span = tracer.startSpan(spanName)
    span.recordException(error)
    console.error(error)
}

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
