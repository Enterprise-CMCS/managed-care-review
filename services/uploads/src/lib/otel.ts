import opentelemetry from '@opentelemetry/api'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { Resource } from '@opentelemetry/resources'
//import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
//import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import {
    MeterProvider,
    PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics'

export function initTracer(serviceName: string, otelCollectorURL: string) {
    console.info('-----Setting OTEL instrumentation-----')

    /*
    registerInstrumentations({
        instrumentations: [getNodeAutoInstrumentations()],
    })
    */

    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        })
    )

    const exporter = new OTLPTraceExporter({
        url: otelCollectorURL,
        headers: {},
    })
    const provider = new NodeTracerProvider({
        idGenerator: new AWSXRayIdGenerator(),
        resource: resource,
    })

    provider.addSpanProcessor(new BatchSpanProcessor(exporter))

    // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
    provider.register()
}

export function initMeter(serviceName: string) {
    const resource = Resource.default().merge(
        new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        })
    )
    const metricReader = new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter(),
        exportIntervalMillis: 1000,
    })

    const provider = new MeterProvider({
        resource: resource,
    })

    provider.addMetricReader(metricReader)
    opentelemetry.metrics.setGlobalMeterProvider(provider)
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

export function recordHistogram(
    serviceName: string,
    metricName: string,
    executionTime: number
) {
    const meter = opentelemetry.metrics.getMeterProvider().getMeter(serviceName)
    const timeAvScan = meter.createHistogram(metricName)
    timeAvScan.record(executionTime)
}
