import React from 'react'
import {
    WebTracerProvider,
    SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http/build/esnext'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { ZoneContextManager } from '@opentelemetry/context-zone'

const serviceName = 'app-web-' + process.env.REACT_APP_STAGE_NAME

const provider = new WebTracerProvider({
    idGenerator: new AWSXRayIdGenerator(),
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
})

const collectorOptions = {
    url: process.env.REACT_APP_OTEL_COLLECTOR_URL,
    headers: {},
}
const exporter = new OTLPTraceExporter(collectorOptions)

provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

const contextManager = new ZoneContextManager()
provider.register({
    contextManager,
    propagator: new AWSXRayPropagator(),
})

// Registering instrumentations
registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
        getWebAutoInstrumentations({
            // load custom configuration for xml-http-request instrumentation
            '@opentelemetry/instrumentation-xml-http-request': {
                ignoreUrls: [
                    /(.*).launchdarkly\.(com|us)/g,
                    /adobe-ep\.cms\.gov/g,
                    /adobedc\.demdex\.net/g,
                    /(.*)\.adoberesources\.net/g,
                    /(.*)\.google-analytics\.com/g,
                ],
                propagateTraceHeaderCorsUrls: [/.+/g],
            },
            // load custom configuration for fetch instrumentation
            '@opentelemetry/instrumentation-fetch': {
                ignoreUrls: [
                    /(.*).launchdarkly\.(com|us)/g,
                    /adobe-ep\.cms\.gov/g,
                    /adobedc\.demdex\.net/g,
                    /(.*)\.adoberesources\.net/g,
                    /(.*)\.google-analytics\.com/g,
                ],
                //propagateTraceHeaderCorsUrls: [/.+/g],
                propagateTraceHeaderCorsUrls: [/.+/g],
            },
        }),
    ],
})

export type TraceProviderProps = {
    children?: React.ReactNode
}

export default function TraceProvider({
    children,
}: TraceProviderProps): React.ReactElement {
    return <>{children}</>
}
