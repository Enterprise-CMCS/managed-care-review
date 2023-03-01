import opentelemetry, { SpanStatusCode } from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { Resource } from '@opentelemetry/resources'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'

import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc'
import {
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics'

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

export function initMeter(serviceName: string, otelCollectorURL: string) {
    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        })
    )
    const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
            url: otelCollectorURL,
        }),
        exportIntervalMillis: 1000,
    })

    const provider = new MeterProvider({
        resource: resource,
    })

    provider.addMetricReader(metricReader)
    opentelemetry.metrics.setGlobalMeterProvider(provider)
}

export function recordException(error: string | Error, serviceName: string) {
    const tracer = opentelemetry.trace.getTracer(serviceName)
    const span = tracer.startSpan('JSException')
    span.recordException(error)
    span.setStatus({ code: SpanStatusCode.ERROR })
    console.error(error)
    span.end()
}
