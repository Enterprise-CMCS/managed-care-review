import opentelemetry, { Span } from '@opentelemetry/api'

const serviceNameOTEL = 'app-web-' + import.meta.env.VITE_APP_STAGE_NAME

function getTracer() {
    return opentelemetry.trace.getTracer(serviceNameOTEL)
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

function recordJSException(error: string | Error): void {
    const tracer = getTracer()
    const span = tracer.startSpan('JSException')
    span.recordException(error)
    console.error(error)
    span.end()
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
