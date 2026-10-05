import { submissionEventSchema } from './event'
import { submissionEventsStage } from './config'

export const exampleEvent = {
    envelopeVersion: 1 as const,
    eventId: '11111111-1111-4111-8111-111111111111',
    source: 'stateportal' as const,
    stage: 'poc-events',
    eventType: 'contract.submitted' as const,
    occurredAt: '2026-10-01T12:00:00.000Z',
    submissionId: '22222222-2222-4222-8222-222222222222',
    contractId: '33333333-3333-4333-8333-333333333333',
    contractRevisionId: '44444444-4444-4444-8444-444444444444',
    rates: [
        {
            rateId: '55555555-5555-4555-8555-555555555555',
            rateRevisionId: '66666666-6666-4666-8666-666666666666',
            submittedInThisEvent: true,
        },
    ],
}

describe('submission notification envelope', () => {
    it('accepts versioned submission references', () => {
        expect(submissionEventSchema.parse(exampleEvent)).toEqual(exampleEvent)
    })
    it('rejects full payloads and unknown envelope versions', () => {
        expect(
            submissionEventSchema.safeParse({
                ...exampleEvent,
                formData: { secret: 'not allowed' },
            }).success
        ).toBe(false)
        expect(
            submissionEventSchema.safeParse({
                ...exampleEvent,
                envelopeVersion: 2,
            }).success
        ).toBe(false)
        expect(
            submissionEventSchema.safeParse({
                ...exampleEvent,
                rates: [
                    { ...exampleEvent.rates[0], downloadURL: 'not allowed' },
                ],
            }).success
        ).toBe(false)
    })
})

describe('review-only opt-in', () => {
    it('requires both an explicit flag and a valid review stage', () => {
        expect(submissionEventsStage({ stage: 'poc-events' })).toBeUndefined()
        expect(
            submissionEventsStage({ SUBMISSION_EVENTS_POC_ENABLED: 'true' })
        ).toBeUndefined()
        expect(
            submissionEventsStage({
                stage: 'poc-events',
                SUBMISSION_EVENTS_POC_ENABLED: 'true',
            })
        ).toBe('poc-events')
        expect(
            submissionEventsStage({
                stage: 'INVALID!',
                SUBMISSION_EVENTS_POC_ENABLED: 'true',
            })
        ).toBeUndefined()
    })
    it.each(['dev', 'val', 'qa', 'prod', 'main', 'master', 'production'])(
        'never enables %s',
        (stage) => {
            expect(
                submissionEventsStage({
                    stage,
                    SUBMISSION_EVENTS_POC_ENABLED: 'true',
                })
            ).toBeUndefined()
        }
    )
})
