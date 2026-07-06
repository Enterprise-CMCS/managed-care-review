import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trace, type Tracer } from '@opentelemetry/api'
import { sendSESEmail } from './awsSES'
import { sendSESEmails } from './emailer'
import type { EmailData } from './emailer'

// Mock only the SES transport; getSESEmailParams (the real EmailData -> SES
// params mapping) is preserved so sendSESEmails runs its real code path.
vi.mock('./awsSES', async (importActual) => {
    const actual = (await importActual()) as Record<string, unknown>
    return { ...actual, sendSESEmail: vi.fn() }
})

const mockedSendSESEmail = vi.mocked(sendSESEmail)

const emailData: EmailData = {
    bodyText: 'hello',
    bodyHTML: '<p>hello</p>',
    sourceEmail: 'no-reply@example.com',
    subject: 'New Submission',
    toAddresses: ['zuko@example.com', 'aang@example.com'],
    ccAddresses: ['iroh@example.com'],
    bccAddresses: [],
}

describe('sendSESEmails', () => {
    let span: {
        setAttribute: ReturnType<typeof vi.fn>
        setStatus: ReturnType<typeof vi.fn>
        recordException: ReturnType<typeof vi.fn>
        end: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
        mockedSendSESEmail.mockReset()
        span = {
            setAttribute: vi.fn(),
            setStatus: vi.fn(),
            recordException: vi.fn(),
            end: vi.fn(),
        }
        vi.spyOn(trace, 'getTracer').mockReturnValue({
            startSpan: vi.fn(() => span),
        } as unknown as Tracer)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('sends via SES and records the returned MessageId on a successful span', async () => {
        mockedSendSESEmail.mockResolvedValue({ MessageId: 'ses-message-1' })

        const result = await sendSESEmails(emailData)

        expect(result).toBeUndefined()
        expect(mockedSendSESEmail).toHaveBeenCalledTimes(1)
        expect(span.setAttribute).toHaveBeenCalledWith(
            'email.ses_message_id',
            'ses-message-1'
        )
        expect(span.setAttribute).toHaveBeenCalledWith(
            'email.outcome',
            'success'
        )
    })

    it('returns an Error and marks the span failed when the SES send throws', async () => {
        mockedSendSESEmail.mockRejectedValue(new Error('network down'))

        const result = await sendSESEmails(emailData)

        // The send failure is returned by value (not thrown) so callers keep
        // their existing error handling, and the span is marked failed.
        expect(result).toBeInstanceOf(Error)
        expect(span.setAttribute).toHaveBeenCalledWith(
            'email.outcome',
            'failure'
        )
        expect(span.recordException).toHaveBeenCalled()
    })
})
