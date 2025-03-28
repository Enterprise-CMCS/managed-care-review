import { Attributes, Span, SpanStatusCode, Tracer } from '@opentelemetry/api'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import React from 'react'

// Get the tracing context outside of React components
let tracingContext: ReturnType<typeof useTracing> | undefined

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

export function useTracing() {
    const context = React.useContext(TraceContext)
    if (!context) {
        throw new Error('useTracing must be used within a TraceProvider')
    }
    return context
}

export const TraceContext = React.createContext<TraceContextValue | undefined>(
    undefined
)

export function setGlobalTracingContext(
    context: ReturnType<typeof useTracing>
) {
    tracingContext = context
}

function getTracingContext() {
    if (!tracingContext) {
        throw new Error(
            'Tracing context not initialized. Ensure TraceProvider is mounted.'
        )
    }
    return tracingContext
}

// Bridge functions that maintain the same interface
export async function recordSpan(
    name: string,
    cb?: () => Promise<void>,
    parentSpan?: Span
): Promise<void> {
    const { startSpan } = getTracingContext()

    const span = startSpan(name, {
        [SemanticAttributes.CODE_FUNCTION]: name,
    })

    if (parentSpan) {
        // Maintain parent-child relationship if parent span is provided
        span.setAttribute('parent.span.id', parentSpan.spanContext().spanId)
    }

    if (cb) {
        try {
            await cb()
            span.setStatus({ code: SpanStatusCode.OK })
        } catch (err) {
            if (err instanceof Error) {
                span.recordException(err)
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: err.message,
                })
            }
            throw err
        } finally {
            span.end()
        }
    } else {
        span.end()
    }
}

export function recordJSException(error: string | Error): void {
    const { startSpan } = getTracingContext()
    const span = startSpan('JSException', {
        [SemanticAttributes.EXCEPTION_TYPE]: 'JSException',
    })

    if (typeof error === 'string') {
        span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error)
        console.error(error)
    } else {
        span.recordException(error)
        span.setAttribute(SemanticAttributes.EXCEPTION_TYPE, error.name)
        span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error.message)
        span.setAttribute(
            SemanticAttributes.EXCEPTION_STACKTRACE,
            error.stack || ''
        )
        console.error(error)
    }

    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: typeof error === 'string' ? error : error.message,
    })
    span.end()
}

export function recordJSExceptionWithContext(
    error: string | Error,
    spanName: string
): void {
    const { startSpan } = getTracingContext()
    const span = startSpan(spanName, {
        [SemanticAttributes.EXCEPTION_TYPE]: 'JSException',
        [SemanticAttributes.CODE_FUNCTION]: spanName,
    })

    if (typeof error === 'string') {
        span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error)
        console.error(error)
    } else {
        span.recordException(error)
        span.setAttribute(SemanticAttributes.EXCEPTION_TYPE, error.name)
        span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error.message)
        span.setAttribute(
            SemanticAttributes.EXCEPTION_STACKTRACE,
            error.stack || ''
        )
        console.error(error)
    }

    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: typeof error === 'string' ? error : error.message,
    })
    span.end()
}

export function recordUserInputException(error: string | Error): void {
    const { startSpan } = getTracingContext()
    const span = startSpan('UserInputException', {
        [SemanticAttributes.EXCEPTION_TYPE]: 'UserInputException',
    })

    if (typeof error === 'string') {
        span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error)
        console.error(error)
    } else {
        span.recordException(error)
        span.setAttribute(SemanticAttributes.EXCEPTION_TYPE, error.name)
        span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error.message)
        span.setAttribute(
            SemanticAttributes.EXCEPTION_STACKTRACE,
            error.stack || ''
        )
        console.error(error)
    }

    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: typeof error === 'string' ? error : error.message,
    })
    span.end()
}
