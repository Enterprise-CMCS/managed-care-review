import { ApolloError } from '@apollo/client'
import opentelemetry, {
    trace,
    Span,
    SpanKind,
    SpanStatusCode,
    Attributes,
} from '@opentelemetry/api'

function getTracer() {
    return trace.getTracer('app-web-' + process.env.VITE_APP_STAGE_NAME)
}

// Add a span to existing trace or if none, start and end and new span
// if a callback is passed in, end span after that async action, this could allow the trace to also collect how long the action took
// based on https://blog.devgenius.io/measuring-react-performance-with-opentelemetry-and-honeycomb-2b20a7920335
async function recordSpan(
    name: string,
    cb?: () => Promise<void>,
    parentSpan?: Span
): Promise<void> {
    const tracer = getTracer()
    let span: Span
    if (parentSpan) {
        const otelContext = opentelemetry.trace.setSpan(
            opentelemetry.context.active(),
            parentSpan
        )
        span = tracer.startSpan(name, undefined, otelContext)
    } else {
        span = tracer.startSpan(name)
    }

    if (cb) {
        try {
            await cb()
        } catch (err) {
            span.recordException(err)
        }
    }

    span.end()

    return
}

function isApolloError(error: unknown): error is ApolloError {
    return (
        error instanceof Error &&
        'graphQLErrors' in error &&
        'networkError' in error &&
        'message' in error
    )
}

function isErrorWithStatus(
    error: unknown
): error is Error & { status: number } {
    return (
        error instanceof Error &&
        'status' in error &&
        typeof error.status === 'number'
    )
}

function recordJSException(
    error: unknown,
    additionalAttributes: Attributes = {}
): void {
    const tracer = getTracer()
    const span = tracer.startSpan('JSException', { kind: SpanKind.INTERNAL })

    try {
        const errorObject =
            error instanceof Error ? error : new Error(String(error))

        // Basic error attributes
        const attributes: Attributes = {
            'error.type': errorObject.name,
            'error.message': errorObject.message,
            'error.stack': errorObject.stack || '',
            ...additionalAttributes,
        }

        if (isErrorWithStatus(errorObject)) {
            attributes['error.http.status_code'] = errorObject.status.toString()
        }

        if (isApolloError(errorObject)) {
            if (errorObject.networkError) {
                attributes['error.apollo.hasNetworkError'] = 'true'
                if (
                    'status' in errorObject.networkError &&
                    typeof errorObject.networkError.status === 'number'
                ) {
                    attributes['error.http.status_code'] =
                        errorObject.networkError.status.toString()
                }
            }

            if (errorObject.graphQLErrors.length > 0) {
                attributes['error.apollo.hasGraphQLErrors'] = 'true'
                attributes['error.apollo.graphQLErrorCount'] =
                    errorObject.graphQLErrors.length.toString()
            }
        }

        span.setAttributes(attributes)
        span.recordException(errorObject)
        span.setStatus({ code: SpanStatusCode.ERROR })

        console.error('Recorded JS Exception:', errorObject, attributes)
    } catch (recordingError) {
        console.error('Error while recording exception:', recordingError)
    } finally {
        span.end()
    }
}

export function recordJSExceptionWithContext(
    error: string | Error,
    spanName: string
) {
    const tracer = getTracer()
    const span = tracer.startSpan(spanName)
    span.recordException(error)
    console.error(error)
}

function recordUserInputException(error: string | Error): void {
    const tracer = getTracer()
    const span = tracer.startSpan('UserInputException')
    span.recordException(error)
    console.error(error)
    span.end()
}

export { getTracer, recordSpan, recordJSException, recordUserInputException }
