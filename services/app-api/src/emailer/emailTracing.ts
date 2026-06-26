import {
    trace,
    context as otelContext,
    SpanStatusCode,
    type Span,
    type Attributes,
} from '@opentelemetry/api'
import { parseErrorToError } from '@mc-review/helpers'

/**
 * Instrumentation scope for email-send spans.
 *
 * The Datadog `service` tag comes from the tracer provider's resource
 * (service.name = `app-api-<stage>`), NOT from this scope name, so every email
 * span still lands under the same `app-api-<env>` service as the rest of the API
 * while sharing a dedicated, queryable span name.
 */
export const EMAIL_TRACER_SCOPE = 'mcreview.email'

/**
 * Stable span name for every transactional email send via SES.
 *
 * Search Datadog APM with `operation_name:email.send` (optionally filtered on the
 * `@email.*` attributes below) to see who notifications were sent to, the SES
 * message id for correlating with any future bounce/complaint events, and
 * whether the send succeeded (`@email.outcome`).
 */
export const EMAIL_SPAN_NAME = 'email.send'

export type EmailSpanAttributes = {
    toAddresses: string[]
    ccAddresses: string[]
    bccAddresses: string[]
    sourceEmail: string
    subject: string
}

function toSpanAttributes(attributes: EmailSpanAttributes): Attributes {
    return {
        // The recipients the email was sent to — the primary thing we want a
        // record of so we know who was (or was not) notified.
        'email.to_addresses': attributes.toAddresses,
        'email.cc_addresses': attributes.ccAddresses,
        'email.bcc_addresses': attributes.bccAddresses,
        'email.recipient_count':
            attributes.toAddresses.length +
            attributes.ccAddresses.length +
            attributes.bccAddresses.length,
        'email.source': attributes.sourceEmail,
        // Subject stands in for "which email" — the templates encode their type
        // (new submission, unlock, question, etc.) in the subject line.
        'email.subject': attributes.subject,
    }
}

/**
 * Records an email-send failure on its span using the current OTEL pattern
 * (recordException + ERROR status), and sets `email.outcome` so healthy and
 * failed sends are easy to split in APM.
 */
export function recordEmailFailure(span: Span, error: Error | string): void {
    const err = error instanceof Error ? error : new Error(error)
    span.setAttribute('email.outcome', 'failure')
    span.recordException(err)
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
}

/**
 * Wraps a single SES email send in a dedicated span so transactional emails are
 * traced consistently. Mirrors `withZipSpan`:
 *
 * - nested spans become children via context propagation
 * - an error returned by value (the emailer's convention) is recorded as a span
 *   error via {@link recordEmailFailure}
 * - a thrown error is recorded and rethrown
 * - the span is always ended
 *
 * The wrapped function receives the span so it can attach the SES `MessageId`
 * once the send returns. The return value (including any `Error` value) is passed
 * back unchanged, so callers keep their existing error handling.
 */
export async function withEmailSpan<T>(
    attributes: EmailSpanAttributes,
    fn: (span: Span) => Promise<T>
): Promise<T> {
    const tracer = trace.getTracer(EMAIL_TRACER_SCOPE)
    const span = tracer.startSpan(EMAIL_SPAN_NAME, {
        attributes: toSpanAttributes(attributes),
    })

    // Run within the span's context so any nested spans parent to it.
    const spanContext = trace.setSpan(otelContext.active(), span)

    try {
        const result = await otelContext.with(spanContext, () => fn(span))
        if (result instanceof Error) {
            recordEmailFailure(span, result)
        } else {
            span.setAttribute('email.outcome', 'success')
        }
        return result
    } catch (error) {
        recordEmailFailure(span, parseErrorToError(error))
        throw error
    } finally {
        span.end()
    }
}
