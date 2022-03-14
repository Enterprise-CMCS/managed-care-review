import React from 'react'
import {
    ConsoleSpanExporter,
    SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { BaseOpenTelemetryComponent } from '@opentelemetry/plugin-react-load'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import {
    OTLPTraceExporter,
    OTLPExporterNodeConfigBase,
} from '@opentelemetry/exporter-trace-otlp-http'
import { diag, DiagConsoleLogger } from '@opentelemetry/api'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'

const serviceName = 'app-web-testing'

const provider = new WebTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
})

const exporterConfig: OTLPExporterNodeConfigBase = {
    url: process.env.REACT_APP_OTEL_COLLECTOR_URL,
}

const exporter = new OTLPTraceExporter(exporterConfig)

const fetchInstrumentation = new FetchInstrumentation({
    propagateTraceHeaderCorsUrls: ['/.*/g'],
    clearTimingResources: true,
})
fetchInstrumentation.setTracerProvider(provider)

provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

provider.register({
    contextManager: new ZoneContextManager(),
})

// Registering instrumentations
registerInstrumentations({
    instrumentations: [
        new FetchInstrumentation(),
        new DocumentLoadInstrumentation(),
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
