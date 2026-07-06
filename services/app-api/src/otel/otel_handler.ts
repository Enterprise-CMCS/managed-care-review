import opentelemetry, { ROOT_CONTEXT, SpanStatusCode } from '@opentelemetry/api'
import {
    resourceFromAttributes,
    defaultResource,
} from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { PrismaInstrumentation } from '@prisma/instrumentation'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import {
    ATTR_SERVICE_NAME,
    SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions'

const DD_TRACES_URL = 'https://otlp.ddog-gov.com/v1/traces'

let tracerProvider: NodeTracerProvider | undefined

function getDDHeaders() {
    if (!process.env.DD_API_KEY) {
        throw new Error(
            'Configuration error: DD_API_KEY environment variable is required for OpenTelemetry'
        )
    }
    return {
        'dd-api-key': process.env.DD_API_KEY,
        'dd-otlp-source': 'datadog',
        'dd-otel-span-mapping': '{span_name_as_resource_name: false}',
    }
}

// Local dev sets OTEL_EXPORTER_OTLP_TRACES_ENDPOINT (in .envrc) to point at
// the local Jaeger container's OTLP port. Deployed environments leave it
// unset and export directly to Datadog.
function getExporterConfig() {
    const localEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
    if (localEndpoint) {
        return { url: localEndpoint, headers: {} }
    }
    return { url: DD_TRACES_URL, headers: getDDHeaders() }
}

export function initTracer(serviceName: string) {
    // Skip OTEL setup under unit tests (setupTests.ts sets stage='test'). This
    // keeps tests hermetic: without a registered provider, recordException/
    // recordSpanEvent use a no-op tracer and flushTracer() short-circuits, so
    // no real OTLP exporter is created and no outbound spans are attempted.
    if (process.env.stage === 'test') return

    // Guard against re-registration on warm Lambda invocations — registering
    // multiple providers causes duplicate spans and leaks span processors
    if (tracerProvider) return

    console.info('-----Setting OTEL instrumentation-----')

    if (!process.env.stage) {
        throw new Error(
            'Configuration error: stage environment variable is required for OpenTelemetry'
        )
    }

    const resource = defaultResource().merge(
        resourceFromAttributes({
            [ATTR_SERVICE_NAME]: serviceName,
            [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.stage,
        })
    )

    const exporter = new OTLPTraceExporter(getExporterConfig())
    const provider = new NodeTracerProvider({
        resource,
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

    tracerProvider = provider
    console.info('Prisma instrumentation registered')
}

// Call after each Lambda invocation to flush queued spans before Lambda freezes
export async function flushTracer(): Promise<void> {
    if (tracerProvider) {
        await tracerProvider.forceFlush()
    }
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

// Records a standalone, successful span carrying the given attributes.
// Used to emit a queryable signal for events we want to track volume/trends
// on (e.g. delegated-user requests) independent of the outcome of the
// request that triggered them.
export function recordSpanEvent(
    serviceName: string,
    spanName: string,
    attributes: Record<string, string | number | boolean>
) {
    const tracer = opentelemetry.trace.getTracer(serviceName)
    // Start from ROOT_CONTEXT so this span is not parented to the active
    // request span — it must survive independently of that trace's sampling.
    const span = tracer.startSpan(spanName, { attributes }, ROOT_CONTEXT)

    try {
        span.setStatus({ code: SpanStatusCode.OK })
    } finally {
        span.end()
    }
}
