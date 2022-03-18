import opentelemetry from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import {
    SimpleSpanProcessor,
    ConsoleSpanExporter,
    BasicTracerProvider,
} from '@opentelemetry/sdk-trace-base'
import { B3Propagator } from '@opentelemetry/propagator-b3'
import { ZoneContextManager } from '@opentelemetry/context-zone'

const serviceName = 'app-api-' + process.env.REACT_APP_STAGE_NAME
const provider = new BasicTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
})

// log to console and send to New Relic
const exporter = new OTLPTraceExporter({
    url: process.env.REACT_APP_OTEL_COLLECTOR_URL,
    headers: {},
})

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

// Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new B3Propagator(),
})

export const tracer = opentelemetry.trace.getTracer(serviceName)
