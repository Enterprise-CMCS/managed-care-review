import opentelemetry from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { Resource } from '@opentelemetry/resources'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'

export function initTracer(serviceName: string, otelCollectorURL: string) {
    console.info('-----Setting OTEL instrumentation-----')

    registerInstrumentations({
        instrumentations: [getNodeAutoInstrumentations()],
    })

    const exporter = new CollectorTraceExporter({
        url: otelCollectorURL,
        headers: {},
    })
    const provider = new NodeTracerProvider({
        idGenerator: new AWSXRayIdGenerator(),
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
    })

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

    // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
    provider.register({
        propagator: new AWSXRayPropagator(),
    })
}

export function recordException(error: string | Error, serviceName: string) {
    const tracer = opentelemetry.trace.getTracer(serviceName)
    const span = tracer.startSpan('JSException')
    span.recordException(error)
    console.error(error)
    span.end()
}
