import React from 'react'
import {
    ConsoleSpanExporter,
    SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { BaseOpenTelemetryComponent } from '@opentelemetry/plugin-react-load'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector'
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

const exporter = new CollectorTraceExporter({
    url: 'http://localhost:4318/v1/traces',
})

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
    instrumentations: [new FetchInstrumentation()],
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
