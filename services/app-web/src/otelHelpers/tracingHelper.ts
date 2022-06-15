import opentelemetry, { Span } from '@opentelemetry/api'

const serviceNameOTEL = 'app-web-' + process.env.REACT_APP_STAGE_NAME

// Start and end a named span
// if a callback is passed in, end span after that async action, this could allow the trace to also collect how long the action took
// based on https://blog.devgenius.io/measuring-react-performance-with-opentelemetry-and-honeycomb-2b20a7920335
async function recordGenericTrace(name: string, cb?: () => Promise<void>, parentSpan?: Span): Promise<void> {
    const tracer = getTracer()
    let span
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
    span.end()
}


function getTracer() {
    const tracer = opentelemetry.trace.getTracer(serviceNameOTEL)
    return tracer
}


export { getTracer, recordGenericTrace, recordJSException }
