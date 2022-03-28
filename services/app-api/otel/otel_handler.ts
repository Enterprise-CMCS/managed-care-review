import opentelemetry from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import {
    SimpleSpanProcessor,
    ConsoleSpanExporter,
} from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { GraphQLInstrumentation } from '@opentelemetry/instrumentation-graphql'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'

const serviceName = 'app-api-' + process.env.REACT_APP_STAGE_NAME
const provider = new NodeTracerProvider({
    idGenerator: new AWSXRayIdGenerator(),
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
})

// log to console and send to New Relic
const exporter = new OTLPTraceExporter({
    url: process.env.REACT_APP_OTEL_COLLECTOR_URL,
    headers: {},
})
console.log('--------- debug otel_handler.ts --------------')
console.log(serviceName)
console.log(exporter)

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

// Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
provider.register({
    propagator: new AWSXRayPropagator(),
})

registerInstrumentations({
    instrumentations: [
        new GraphQLInstrumentation({
            depth: 2,
            mergeItems: true,
        }),
        new HttpInstrumentation(),
    ],
})

export const tracer = opentelemetry.trace.getTracer(serviceName)
