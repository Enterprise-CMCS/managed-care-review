import React from 'react'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { BaseOpenTelemetryComponent } from '@opentelemetry/plugin-react-load'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { diag, DiagConsoleLogger } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web'
import { B3Propagator } from '@opentelemetry/propagator-b3'

const serviceName = 'app-web-' + process.env.REACT_APP_STAGE_NAME

const provider = new WebTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
})

const exporter = new OTLPTraceExporter({
    url: process.env.REACT_APP_OTEL_COLLECTOR_URL,
    headers: {},
})

provider.addSpanProcessor(new BatchSpanProcessor(exporter))

provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new B3Propagator(),
})

// Registering instrumentations
registerInstrumentations({
    instrumentations: [
        getWebAutoInstrumentations({
            // load custom configuration for xml-http-request instrumentation
            '@opentelemetry/instrumentation-xml-http-request': {
                propagateTraceHeaderCorsUrls: [/.+/g],
            },
            // load custom configuration for fetch instrumentation
            '@opentelemetry/instrumentation-fetch': {
                propagateTraceHeaderCorsUrls: [/.+/g],
            },
        }),
    ],
})

BaseOpenTelemetryComponent.setTracer(serviceName)
diag.setLogger(new DiagConsoleLogger())

export type TraceProviderProps = {
    children?: React.ReactNode
}

export default function TraceProvider({
    children,
}: TraceProviderProps): React.ReactElement {
    return <>{children}</>
}
