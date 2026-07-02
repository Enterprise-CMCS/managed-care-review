import {
    trace,
    context as otelContext,
    SpanKind,
    SpanStatusCode,
    type Span,
} from '@opentelemetry/api'
import { parseErrorToError } from '@mc-review/helpers'

/**
 * Instrumentation scope for S3 data-plane spans.
 *
 * The Datadog `service` tag comes from the tracer provider's resource
 * (service.name = `app-api-<stage>`), not from this scope name, so S3 spans land
 * under the same service as the rest of the API while sharing a dedicated,
 * queryable span name (`s3.<operation>`).
 *
 */
export const S3_TRACER_SCOPE = 'mcreview.s3'

export type S3SpanAttributes = {
    /** S3 operation name, e.g. 'GetObject' | 'PutObject' */
    operation: string
    bucket: string
    key: string
}

// AWS SDK v3 command outputs (and errors) all carry `$metadata`. We only read
// the retry/status fields, so type just those rather than depending on the SDK.
type WithS3Metadata = {
    $metadata?: {
        httpStatusCode?: number
        attempts?: number
        totalRetryDelay?: number
    }
}

function recordMetadata(
    span: Span,
    metadata: WithS3Metadata['$metadata']
): void {
    if (!metadata) return
    if (typeof metadata.httpStatusCode === 'number') {
        span.setAttribute('http.status_code', metadata.httpStatusCode)
    }
    // attempts === 1 is the clean first-try case. attempts > 1 means the SDK had
    // to retry — for S3 that is almost always throttling (503 SlowDown) or a 5xx,
    // and total_retry_delay_ms is the backoff time spent. This makes throttling
    // visible even when the request eventually succeeds (i.e. just looks slow).
    if (typeof metadata.attempts === 'number') {
        span.setAttribute('aws.request.attempts', metadata.attempts)
    }
    if (typeof metadata.totalRetryDelay === 'number') {
        span.setAttribute(
            'aws.request.total_retry_delay_ms',
            metadata.totalRetryDelay
        )
    }
}

/**
 * Wraps a single S3 `send()` call in a dedicated `s3.<operation>` span so each
 * GET/PUT our Lambda makes is traced consistently. Nested under whatever span is
 * active (resolver or `zip.generate`) via context propagation.
 *
 * On success it records the SDK's own retry accounting from `$metadata`
 * (`aws.request.attempts`, `aws.request.total_retry_delay_ms`) plus the HTTP
 * status. On failure it records the exception with the S3 error code preserved
 * (`error.name`, e.g. `SlowDown` / `ThrottlingException`) and the HTTP status
 * from the error's `$metadata`, then rethrows — callers keep their existing
 * error handling unchanged.
 */
export async function withS3Span<T extends WithS3Metadata>(
    attributes: S3SpanAttributes,
    fn: () => Promise<T>
): Promise<T> {
    const tracer = trace.getTracer(S3_TRACER_SCOPE)
    // SpanKind.CLIENT so S3 registers as an outbound dependency call in APM
    // service-map / dependency views rather than an internal span.
    const span = tracer.startSpan(`s3.${attributes.operation}`, {
        kind: SpanKind.CLIENT,
        attributes: {
            'aws.s3.operation': attributes.operation,
            'aws.s3.bucket': attributes.bucket,
            // Safe to record raw: keys are UUID + revision-ID based
            // (e.g. `allusers/<uuid>.<ext>`, `zips/rates/<rateRevisionID>/...`),
            'aws.s3.key': attributes.key,
        },
    })

    // Run within the span's context so it parents to the active resolver/zip span.
    const spanContext = trace.setSpan(otelContext.active(), span)

    try {
        const result = await otelContext.with(spanContext, fn)
        recordMetadata(span, result?.$metadata)
        return result
    } catch (error) {
        const err = parseErrorToError(error)
        span.recordException(err)
        // Preserve the S3 error identity even where the caller later flattens it
        // (e.g. uploadFile collapses everything to NETWORK_ERROR).
        span.setAttribute('error.name', err.name)
        recordMetadata(span, (error as WithS3Metadata)?.$metadata)
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
        throw error
    } finally {
        span.end()
    }
}
