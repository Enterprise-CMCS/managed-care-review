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
import { W3CTraceContextPropagator } from '@opentelemetry/core'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import React, { useMemo } from 'react'
import {
    useTracing,
    TraceContext,
    setGlobalTracingContext,
} from '@mc-review/otel'
import {
    ATTR_SERVICE_NAME,
    SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
    ATTR_EXCEPTION_TYPE,
    ATTR_EXCEPTION_MESSAGE,
    ATTR_EXCEPTION_STACKTRACE,
    SEMATTRS_CODE_FILEPATH,
    SEMATTRS_CODE_FUNCTION,
} from '@opentelemetry/semantic-conventions'

let tracerInstance: Tracer | undefined

function initializeTracer() {
    if (tracerInstance) return tracerInstance

    const serviceName = 'app-web-' + import.meta.env.VITE_APP_STAGE_NAME

    const provider = new WebTracerProvider({
        resource: new Resource({
            [ATTR_SERVICE_NAME]: serviceName,
            [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: import.meta.env
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
        propagator: new W3CTraceContextPropagator(),
    })

    // Get API URL to only propagate trace headers to our backend
    const apiUrl = import.meta.env.VITE_APP_API_URL
    if (!apiUrl || apiUrl === '') {
        throw new Error(
            'VITE_APP_API_URL must be set for OpenTelemetry trace propagation'
        )
    }
    // Anchor regex to start of URL to prevent matching substrings in unintended domains
    const apiUrlPattern = new RegExp(
        '^' + apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    )

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
                    // Only propagate trace headers to our backend and localhost for development
                    propagateTraceHeaderCorsUrls: [
                        apiUrlPattern,
                        /localhost:\d+/, // Local development
                        /127\.0\.0\.1:\d+/, // Local development alt
                    ],
                },
                '@opentelemetry/instrumentation-fetch': {
                    ignoreUrls: [
                        /(.*).launchdarkly\.(com|us)/g,
                        /adobe-ep\.cms\.gov/g,
                        /adobedc\.demdex\.net/g,
                        /(.*)\.adoberesources\.net/g,
                        /(.*)\.google-analytics\.com/g,
                    ],
                    // Only propagate trace headers to our backend and localhost for development
                    propagateTraceHeaderCorsUrls: [
                        apiUrlPattern,
                        /localhost:\d+/, // Local development
                        /127\.0\.0\.1:\d+/, // Local development alt
                    ],
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

function getErrorAttributes(error: Error): Attributes {
    return {
        [ATTR_EXCEPTION_TYPE]: error.name,
        [ATTR_EXCEPTION_MESSAGE]: error.message,
        [ATTR_EXCEPTION_STACKTRACE]: error.stack ?? undefined,
    }
}

export function useErrorBoundaryTracing() {
    const { recordError } = useTracing()

    return React.useCallback(
        (error: Error, errorInfo: React.ErrorInfo) => {
            recordError(error, {
                spanName: 'ErrorBoundary.error',
                attributes: {
                    [SEMATTRS_CODE_FILEPATH]:
                        errorInfo.componentStack ?? undefined,
                    [SEMATTRS_CODE_FUNCTION]: 'ErrorBoundary',
                    [ATTR_EXCEPTION_TYPE]: 'boundary',
                    'error.componentStack':
                        errorInfo.componentStack ?? undefined,
                },
            })
        },
        [recordError]
    )
}

const mockSpan = {
    setAttribute: () => mockSpan,
    setStatus: () => mockSpan,
    recordException: () => mockSpan,
    end: () => {},
    spanContext: () => ({ traceId: 'mock', spanId: 'mock', traceFlags: 0 }),
    setAttributes: () => mockSpan,
    addEvent: () => mockSpan,
    addLink: () => mockSpan,
    addLinks: () => mockSpan,
    updateName: () => mockSpan,
    isRecording: () => true,
}

// Minimal mock TraceProvider
export function MockTraceProvider({ children }: { children: React.ReactNode }) {
    const mockValue = useMemo(
        () => ({
            tracer: {
                startSpan: () => mockSpan,
                startActiveSpan: () => mockSpan,
            },
            startSpan: () => mockSpan,
            withSpan: async (name: string, operation: Function) =>
                operation(mockSpan),
            recordError: () => {},
        }),
        []
    )

    setGlobalTracingContext(mockValue)

    return (
        <TraceContext.Provider value={mockValue}>
            {children}
        </TraceContext.Provider>
    )
}
