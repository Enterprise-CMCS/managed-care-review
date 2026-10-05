import type { OutboxClient } from './publish'
import { publishPendingSubmissionEvents } from './publish'
import { submissionEventSchema } from './event'

const event = submissionEventSchema.parse({
    envelopeVersion: 1,
    eventId: '11111111-1111-4111-8111-111111111111',
    source: 'stateportal',
    stage: 'poc-events',
    eventType: 'contract.submitted',
    occurredAt: '2026-10-01T12:00:00Z',
    submissionId: '22222222-2222-4222-8222-222222222222',
    contractId: '33333333-3333-4333-8333-333333333333',
    contractRevisionId: '44444444-4444-4444-8444-444444444444',
    rates: [],
})
const now = new Date('2026-10-01T12:00:00Z')

function fixture() {
    const row = {
        id: event.eventId,
        submissionID: event.submissionId,
        event,
        attempts: 0,
    }
    const findMany = vi.fn().mockResolvedValue([row])
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const client = {
        submissionEventOutbox: { findMany, updateMany },
    } as unknown as OutboxClient
    const publish = vi.fn().mockResolvedValue('sns-message-id')
    return { client, publish, findMany, updateMany, row }
}

describe('outbox publisher', () => {
    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
    afterEach(() => vi.restoreAllMocks())

    it('claims only pending events from its stage and records successful publication', async () => {
        const { client, publish, findMany, updateMany } = fixture()
        expect(
            await publishPendingSubmissionEvents(
                client,
                'poc-events',
                publish,
                { now: () => now }
            )
        ).toEqual({ published: 1, failed: 0 })
        expect(findMany.mock.calls[0][0].where).toMatchObject({
            stage: 'poc-events',
            publishedAt: null,
            nextAttemptAt: { lte: now },
        })
        expect(updateMany.mock.calls[0][0].where).toMatchObject({
            id: event.eventId,
            stage: 'poc-events',
            publishedAt: null,
        })
        expect(publish).toHaveBeenCalledWith(event)
        expect(updateMany.mock.calls[1][0].data).toMatchObject({
            publishedAt: now,
            snsMessageID: 'sns-message-id',
            leaseUntil: null,
        })
    })
    it('keeps a failed publish recoverable and retries using the same eventId', async () => {
        const { client, publish, updateMany } = fixture()
        publish.mockRejectedValueOnce(new Error('SNS unavailable'))
        expect(
            await publishPendingSubmissionEvents(
                client,
                'poc-events',
                publish,
                { now: () => now }
            )
        ).toEqual({ published: 0, failed: 1 })
        expect(updateMany.mock.calls[1][0].data).toMatchObject({
            nextAttemptAt: new Date(now.getTime() + 30_000),
            leaseToken: null,
            lastError: 'Error',
        })
        expect(updateMany.mock.calls[1][0].data.publishedAt).toBeUndefined()
        await publishPendingSubmissionEvents(client, 'poc-events', publish, {
            now: () => new Date(now.getTime() + 60_000),
        })
        expect(publish.mock.calls.map(([message]) => message.eventId)).toEqual([
            event.eventId,
            event.eventId,
        ])
    })
    it('can deliver a duplicate with the same eventId if recording publication fails', async () => {
        const { client, publish, updateMany } = fixture()
        updateMany
            .mockResolvedValueOnce({ count: 1 })
            .mockRejectedValueOnce(new Error('DB unavailable'))
        await publishPendingSubmissionEvents(client, 'poc-events', publish, {
            now: () => now,
        })
        await publishPendingSubmissionEvents(client, 'poc-events', publish, {
            now: () => new Date(now.getTime() + 60_000),
        })
        expect(publish.mock.calls.map(([message]) => message.eventId)).toEqual([
            event.eventId,
            event.eventId,
        ])
    })
    it('skips an event another worker claimed', async () => {
        const { client, publish, updateMany } = fixture()
        updateMany.mockResolvedValue({ count: 0 })
        await publishPendingSubmissionEvents(client, 'poc-events', publish, {
            now: () => now,
        })
        expect(publish).not.toHaveBeenCalled()
    })
    it('does not publish cross-stage or malformed payloads', async () => {
        const { client, publish, row, updateMany } = fixture()
        row.event = { ...event, stage: 'another-review' }
        await publishPendingSubmissionEvents(client, 'poc-events', publish, {
            now: () => now,
        })
        expect(publish).not.toHaveBeenCalled()
        expect(updateMany.mock.calls[1][0].data.publishedAt).toBeUndefined()
    })
    it('stops before claiming another row if the invocation is running out of time', async () => {
        const { client, publish, updateMany } = fixture()
        await publishPendingSubmissionEvents(client, 'poc-events', publish, {
            hasTime: () => false,
        })
        expect(updateMany).not.toHaveBeenCalled()
        expect(publish).not.toHaveBeenCalled()
    })
})
