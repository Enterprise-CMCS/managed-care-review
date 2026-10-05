import { randomUUID } from 'node:crypto'
import type { ExtendedPrismaClient } from '../postgres/prismaClient'
import { submissionEventSchema, type SubmissionEvent } from './event'

export type OutboxClient = Pick<ExtendedPrismaClient, 'submissionEventOutbox'>
export type PublishEvent = (event: SubmissionEvent) => Promise<string>

/** At-least-once: publish success followed by a DB failure can publish the same eventId again. */
export async function publishPendingSubmissionEvents(
    client: OutboxClient,
    stage: string,
    publish: PublishEvent,
    options: { now?: () => Date; hasTime?: () => boolean } = {}
): Promise<{ published: number; failed: number }> {
    const now = options.now ?? (() => new Date())
    const eligible = (time: Date) => ({
        stage,
        publishedAt: null,
        nextAttemptAt: { lte: time },
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: time } }],
    })
    const pending = await client.submissionEventOutbox.findMany({
        where: eligible(now()),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 20,
    })
    const result = { published: 0, failed: 0 }
    for (const row of pending) {
        if (options.hasTime && !options.hasTime()) break
        const time = now()
        const leaseToken = randomUUID()
        const claimed = await client.submissionEventOutbox.updateMany({
            where: { id: row.id, ...eligible(time) },
            data: {
                leaseToken,
                leaseUntil: new Date(time.getTime() + 120_000),
                attempts: { increment: 1 },
            },
        })
        if (claimed.count !== 1) continue
        const owned = { id: row.id, stage, leaseToken, publishedAt: null }
        try {
            const event = submissionEventSchema.parse(row.event)
            if (
                event.eventId !== row.id ||
                event.stage !== stage ||
                event.submissionId !== row.submissionID
            ) {
                throw new Error(
                    'Outbox event identity does not match its record'
                )
            }
            const messageID = await publish(event)
            const updated = await client.submissionEventOutbox.updateMany({
                where: owned,
                data: {
                    publishedAt: now(),
                    snsMessageID: messageID,
                    leaseToken: null,
                    leaseUntil: null,
                    lastError: null,
                },
            })
            if (updated.count !== 1)
                throw new Error('Outbox lease lost after publishing')
            result.published++
        } catch (error) {
            // No terminal discard: keep the row recoverable, with capped backoff.
            const delay = Math.min(3600, 30 * 2 ** Math.min(row.attempts, 7))
            const errorName =
                error instanceof Error ? error.name : 'UnknownError'
            await client.submissionEventOutbox.updateMany({
                where: owned,
                data: {
                    nextAttemptAt: new Date(now().getTime() + delay * 1000),
                    leaseToken: null,
                    leaseUntil: null,
                    // Avoid persisting/logging error payloads that might contain credentials.
                    lastError: errorName.slice(0, 100),
                },
            })
            console.error('Submission notification retained for retry', {
                eventId: row.id,
                errorName,
            })
            result.failed++
        }
    }
    return result
}
