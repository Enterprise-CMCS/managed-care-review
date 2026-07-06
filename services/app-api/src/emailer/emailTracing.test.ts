import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    trace,
    SpanStatusCode,
    type Span,
    type Tracer,
} from '@opentelemetry/api'
import {
    withEmailSpan,
    recordEmailFailure,
    EMAIL_SPAN_NAME,
} from './emailTracing'

function makeMockSpan() {
    return {
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
    }
}

describe('emailTracing', () => {
    let span: ReturnType<typeof makeMockSpan>
    let startSpan: ReturnType<typeof vi.fn>

    beforeEach(() => {
        span = makeMockSpan()
        startSpan = vi.fn(() => span)
        // Override the global tracer so withEmailSpan operates on our mock span
        // (under unit tests the real provider is a no-op, so we couldn't observe
        // the attributes it would set otherwise).
        vi.spyOn(trace, 'getTracer').mockReturnValue({
            startSpan,
        } as unknown as Tracer)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const attributes = {
        toAddresses: ['zuko@example.com', 'aang@example.com'],
        ccAddresses: ['iroh@example.com'],
        bccAddresses: ['azula@example.com'],
        sourceEmail: 'no-reply@example.com',
        subject: 'New Submission',
    }

    describe('withEmailSpan', () => {
        it('starts an email.send span tagged with the recipients', async () => {
            await withEmailSpan(attributes, async () => undefined)

            expect(startSpan).toHaveBeenCalledWith(
                EMAIL_SPAN_NAME,
                expect.objectContaining({
                    attributes: expect.objectContaining({
                        'email.to_addresses': attributes.toAddresses,
                        'email.cc_addresses': attributes.ccAddresses,
                        // BCC recipients are counted but never recorded as addresses.
                        'email.recipient_count': 4,
                        'email.source': attributes.sourceEmail,
                        'email.subject': attributes.subject,
                    }),
                })
            )

            const spanAttributes = startSpan.mock.calls[0][1].attributes
            expect(spanAttributes).not.toHaveProperty('email.bcc_addresses')
        })

        it('marks the span successful and ends it when the send resolves', async () => {
            const result = await withEmailSpan(attributes, async (s) => {
                s.setAttribute('email.ses_message_id', 'msg-123')
                return undefined
            })

            expect(result).toBeUndefined()
            expect(span.setAttribute).toHaveBeenCalledWith(
                'email.outcome',
                'success'
            )
            expect(span.setAttribute).toHaveBeenCalledWith(
                'email.ses_message_id',
                'msg-123'
            )
            expect(span.setStatus).not.toHaveBeenCalled()
            expect(span.end).toHaveBeenCalledTimes(1)
        })

        it('records a failure (without throwing) when the callback returns an Error', async () => {
            const err = new Error('SES email send failed')

            const result = await withEmailSpan(attributes, async () => err)

            // The emailer's convention is to return errors by value, not throw —
            // withEmailSpan must surface that error back unchanged to callers.
            expect(result).toBe(err)
            expect(span.setAttribute).toHaveBeenCalledWith(
                'email.outcome',
                'failure'
            )
            expect(span.recordException).toHaveBeenCalledWith(err)
            expect(span.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.ERROR,
                message: err.message,
            })
            expect(span.end).toHaveBeenCalledTimes(1)
        })

        it('records and rethrows when the callback throws, still ending the span', async () => {
            const err = new Error('unexpected fail')

            await expect(
                withEmailSpan(attributes, async () => {
                    throw err
                })
            ).rejects.toThrow('unexpected fail')

            expect(span.setAttribute).toHaveBeenCalledWith(
                'email.outcome',
                'failure'
            )
            expect(span.recordException).toHaveBeenCalled()
            expect(span.end).toHaveBeenCalledTimes(1)
        })
    })

    describe('recordEmailFailure', () => {
        it('coerces a string error into an Error and sets an error status', () => {
            recordEmailFailure(span as unknown as Span, 'string failure')

            expect(span.setAttribute).toHaveBeenCalledWith(
                'email.outcome',
                'failure'
            )
            expect(span.recordException).toHaveBeenCalledWith(expect.any(Error))
            expect(span.setStatus).toHaveBeenCalledWith({
                code: SpanStatusCode.ERROR,
                message: 'string failure',
            })
        })
    })
})
