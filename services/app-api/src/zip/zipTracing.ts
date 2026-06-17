import {
    trace,
    context as otelContext,
    SpanStatusCode,
    type Span,
    type Attributes,
} from '@opentelemetry/api'
import { parseErrorToError } from '@mc-review/helpers'

/**
 * Instrumentation scope for document-zip spans.
 *
 * The Datadog `service` tag is taken from the tracer provider's resource
 * (service.name = `app-api-<stage>`), NOT from this scope name, so every zip
 * span still lands under the same `app-api-<env>` service as the rest of the API
 * while sharing a dedicated, queryable span name.
 */
export const ZIP_TRACER_SCOPE = 'mcreview.zip'

/**
 * Stable span name for every document-zip generation attempt (contract or rate).
 *
 * Search Datadog APM with `operation_name:zip.generate` (optionally filtered on
 * the `@zip.*` attributes below) to see all contract and rate zip traces in one
 * place — this is the standardized entry point for looking at zip traces.
 */
export const ZIP_SPAN_NAME = 'zip.generate'

/**
 * Stable phrase attached to the recorded exception on every failed zip span. The
 * Datadog monitor in `infra/datadog/monitors.tf` free-text matches on this exact
 * string, so it must not change without updating that monitor.
 */
export const ZIP_FAILURE_MARKER = 'Document zip generation failed'

export type ZipType = 'contract' | 'rate'

export type ZipSpanAttributes = {
    zipType: ZipType
    documentType: string
    revisionID: string
    documentCount: number
}

function toSpanAttributes(attributes: ZipSpanAttributes): Attributes {
    return {
        'zip.type': attributes.zipType,
        'zip.document_type': attributes.documentType,
        'zip.revision_id': attributes.revisionID,
        'zip.document_count': attributes.documentCount,
    }
}

/**
 * Records a zip-generation failure on its dedicated span using the current OTEL
 * pattern (recordException + ERROR status). The recorded exception message is
 * prefixed with ZIP_FAILURE_MARKER so the Datadog "zip generation failed"
 * monitor can find it, and `zip.outcome` is set so healthy/failed zips are easy
 * to split in APM.
 */
export function recordZipFailure(span: Span, error: Error | string): void {
    const err = error instanceof Error ? error : new Error(error)
    span.setAttribute('zip.outcome', 'failure')
    span.recordException(new Error(`${ZIP_FAILURE_MARKER}: ${err.message}`))
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
}

/**
 * Wraps a single document-zip generation attempt in a dedicated child span so
 * contract and rate zips are traced consistently across the submit path and the
 * batch regeneration path. Mirrors `withResolverSpan`:
 *
 * - nested spans (S3, Prisma) become children via context propagation
 * - an error returned by value (the zip pipeline's convention) is recorded as a
 *   span error via {@link recordZipFailure}
 * - a thrown error is recorded and rethrown
 * - the span is always ended
 *
 * The wrapped function's return value (including any `Error` value) is passed
 * back through unchanged, so callers keep their existing error handling.
 */
export async function withZipSpan<T>(
    attributes: ZipSpanAttributes,
    fn: (span: Span) => Promise<T>
): Promise<T> {
    const tracer = trace.getTracer(ZIP_TRACER_SCOPE)
    const span = tracer.startSpan(ZIP_SPAN_NAME, {
        attributes: toSpanAttributes(attributes),
    })

    // Run within the span's context so any nested S3/Prisma spans parent to it.
    const spanContext = trace.setSpan(otelContext.active(), span)

    try {
        const result = await otelContext.with(spanContext, () => fn(span))
        if (result instanceof Error) {
            recordZipFailure(span, result)
        } else {
            span.setAttribute('zip.outcome', 'success')
        }
        return result
    } catch (error) {
        recordZipFailure(span, parseErrorToError(error))
        throw error
    } finally {
        span.end()
    }
}
