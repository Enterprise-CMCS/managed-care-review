import opentelemetry, { type Tracer, SpanStatusCode } from '@opentelemetry/api'
import { trace } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import {
    SimpleSpanProcessor,
    BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { PrismaInstrumentation } from '@prisma/instrumentation'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

export function initTracer(serviceName: string, otelCollectorURL: string) {
    console.info('-----Setting OTEL instrumentation-----')

    const resource = new Resource({
        [ATTR_SERVICE_NAME]: serviceName,
    })

    const exporter = new OTLPTraceExporter({
        url: otelCollectorURL,
        headers: {},
    })
    const provider = new NodeTracerProvider({
        resource: resource,
        spanProcessors: [new BatchSpanProcessor(exporter)],
    })

    provider.register({
        propagator: new W3CTraceContextPropagator(),
    })

    // Register Prisma instrumentation to capture database operations
    // Spans will include: prisma:client:*, prisma:engine:*, and prisma:engine:db_query
    registerInstrumentations({
        instrumentations: [new PrismaInstrumentation()],
    })

    console.info('Prisma instrumentation registered')
}

export function recordException(
    error: string | Error,
    serviceName: string,
    spanName: string
) {
    const tracer = opentelemetry.trace.getTracer(serviceName)
    const span = tracer.startSpan(spanName)

    try {
        span.recordException(error)
        span.setStatus({
            code: SpanStatusCode.ERROR,
            message: typeof error === 'string' ? error : error.message,
        })
        console.error(error)
    } finally {
        span.end()
    }
}

export function createTracer(serviceName: string): Tracer {
    const provider = new NodeTracerProvider({
        resource: new Resource({
            [ATTR_SERVICE_NAME]: serviceName,
        }),
    })

    const exporter = new OTLPTraceExporter({
        url: process.env.API_APP_OTEL_COLLECTOR_URL,
        headers: {},
    })

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

    provider.register({
        propagator: new W3CTraceContextPropagator(),
    })

    return trace.getTracer(serviceName)
}
