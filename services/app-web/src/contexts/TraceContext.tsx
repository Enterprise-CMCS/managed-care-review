import {
    Tracer,
    trace,
    context,
    Span,
    SpanStatusCode,
    Attributes,
    AttributeValue,
} from '@opentelemetry/api'
import {
    WebTracerProvider,
    BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import {
    SemanticResourceAttributes,
    SemanticAttributes,
} from '@opentelemetry/semantic-conventions'
import React from 'react'

interface TraceContextValue {
    tracer: Tracer
    startSpan: (name: string, attributes?: Attributes) => Span
    withSpan: <T>(
        name: string,
        operation: (span: Span) => Promise<T>
    ) => Promise<T>
    recordError: (
        error: Error,
        context?: { spanName?: string; attributes?: Attributes }
    ) => void
}

const TraceContext = React.createContext<TraceContextValue | undefined>(
    undefined
)

let tracerInstance: Tracer | undefined

function initializeTracer() {
    if (tracerInstance) return tracerInstance

    const serviceName = 'app-web-' + import.meta.env.VITE_APP_STAGE_NAME

    const provider = new WebTracerProvider({
        idGenerator: new AWSXRayIdGenerator(),
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env
                .VITE_APP_STAGE_NAME,
        }),
    })

    const collectorOptions = {
        url: import.meta.env.VITE_APP_OTEL_COLLECTOR_URL,
        headers: {},
    }

    const exporter = new OTLPTraceExporter(collectorOptions)
    provider.addSpanProcessor(new BatchSpanProcessor(exporter))

    provider.register({
        contextManager: new ZoneContextManager(),
        propagator: new AWSXRayPropagator(),
    })

    registerInstrumentations({
        tracerProvider: provider,
        instrumentations: [
            getWebAutoInstrumentations({
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
                '@opentelemetry/instrumentation-fetch': {
                    ignoreUrls: [
                        /(.*).launchdarkly\.(com|us)/g,
                        /adobe-ep\.cms\.gov/g,
                        /adobedc\.demdex\.net/g,
                        /(.*)\.adoberesources\.net/g,
                        /(.*)\.google-analytics\.com/g,
                    ],
                    propagateTraceHeaderCorsUrls: [/.+/g],
                },
            }),
        ],
    })

    tracerInstance = trace.getTracer(serviceName)
    return tracerInstance
}

export function TraceProvider({ children }: { children: React.ReactNode }) {
    const tracer = React.useMemo(() => initializeTracer(), [])

    const startSpan = React.useCallback(
        (name: string, attributes?: Attributes): Span => {
            const parentSpan = trace.getSpan(context.active())
            const ctx = parentSpan
                ? trace.setSpan(context.active(), parentSpan)
                : context.active()
            const span = tracer.startSpan(name, { attributes }, ctx)
            return span
        },
        [tracer]
    )

    const withSpan = React.useCallback(
        async <T,>(
            name: string,
            operation: (span: Span) => Promise<T>
        ): Promise<T> => {
            const span = startSpan(name)
            try {
                const result = await operation(span)
                span.setStatus({ code: SpanStatusCode.OK })
                return result
            } catch (error) {
                if (error instanceof Error) {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error.message,
                    })
                    span.recordException(error)

                    const errorAttributes = getErrorAttributes(error)
                    Object.entries(errorAttributes).forEach(([key, value]) => {
                        span.setAttribute(key, value as AttributeValue)
                    })
                } else {
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'Unknown error',
                    })
                }
                throw error
            } finally {
                span.end()
            }
        },
        [startSpan]
    )

    const recordError = React.useCallback(
        (
            error: Error,
            context?: { spanName?: string; attributes?: Attributes }
        ) => {
            const errorAttributes = getErrorAttributes(error)
            const span = startSpan(context?.spanName || 'error', {
                ...context?.attributes,
                ...errorAttributes,
            })

            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
            })
            span.recordException(error)
            span.end()
        },
        [startSpan]
    )

    const value = React.useMemo(
        () => ({
            tracer,
            startSpan,
            withSpan,
            recordError,
        }),
        [tracer, startSpan, withSpan, recordError]
    )

    return (
        <TraceContext.Provider value={value}>{children}</TraceContext.Provider>
    )
}

export function useTracing() {
    const context = React.useContext(TraceContext)
    if (!context) {
        throw new Error('useTracing must be used within a TraceProvider')
    }
    return context
}

function getErrorAttributes(error: Error): Attributes {
    return {
        [SemanticAttributes.EXCEPTION_TYPE]: error.name,
        [SemanticAttributes.EXCEPTION_MESSAGE]: error.message,
        [SemanticAttributes.EXCEPTION_STACKTRACE]: error.stack ?? undefined,
    }
}

export function useErrorBoundaryTracing() {
    const { recordError } = useTracing()

    return React.useCallback(
        (error: Error, errorInfo: React.ErrorInfo) => {
            recordError(error, {
                spanName: 'ErrorBoundary.error',
                attributes: {
                    [SemanticAttributes.CODE_FILEPATH]:
                        errorInfo.componentStack ?? undefined,
                    [SemanticAttributes.CODE_FUNCTION]: 'ErrorBoundary',
                    [SemanticAttributes.EXCEPTION_TYPE]: 'boundary',
                    'error.componentStack':
                        errorInfo.componentStack ?? undefined,
                },
            })
        },
        [recordError]
    )
}
