import { must } from '../../testHelpers'
import { mockInsertContractArgs, mockInsertRateArgs } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { NewPostgresStore } from '../postgresStore'
import type { ExtendedPrismaClient } from '../prismaClient'
import { captureSubmissionEvent } from '../../submissionEvents/capture'
import {
    contractSubmissionEventSchema,
    rateSubmissionEventSchema,
} from '../../submissionEvents/event'
import { submitContract } from './submitContract'

// Integration tests: require a disposable, migrated test database.
const clientPromise = sharedTestPrismaClient()
const stage = 'poc-integration'

async function draftPackage() {
    const client = await clientPromise
    const store = NewPostgresStore(client)
    const user = await client.user.create({
        data: {
            givenName: 'Event',
            familyName: 'Test',
            email: 'submission-events-test@example.com',
            role: 'STATE_USER',
            stateCode: 'MN',
        },
    })
    const draft = must(
        await store.insertDraftContract(mockInsertContractArgs({}))
    )
    const withRates = must(
        await store.updateDraftContractRates({
            contractID: draft.id,
            rateUpdates: {
                create: [{ formData: mockInsertRateArgs(), ratePosition: 1 }],
                update: [],
                link: [],
                unlink: [],
                delete: [],
            },
        })
    )
    return { client, store, user, draft: withRates }
}

async function eventsFor(contractId: string) {
    const client = await clientPromise
    return client.submissionEventOutbox.findMany({
        where: { stage, event: { path: ['contractId'], equals: contractId } },
        orderBy: { createdAt: 'asc' },
    })
}

describe('transactional submission notifications', () => {
    beforeEach(() => {
        vi.stubEnv('stage', stage)
        vi.stubEnv('SUBMISSION_EVENTS_POC_ENABLED', 'true')
    })
    afterEach(() => {
        vi.unstubAllEnvs()
        vi.restoreAllMocks()
    })

    it('commits initial/resubmission references and retains identity on repeated capture', async () => {
        const { client, store, user, draft } = await draftPackage()
        const first = must(
            await store.submitContract({
                contractID: draft.id,
                submittedByUserID: user.id,
                submittedReason: 'initial',
            })
        )
        const [initialRow] = await eventsFor(draft.id)
        const initial = contractSubmissionEventSchema.parse(initialRow.event)
        expect(initial).toMatchObject({
            eventType: 'contract.submitted',
            contractId: draft.id,
            contractRevisionId: first.revisions[0].id,
        })
        expect(initial.rates).toHaveLength(1)
        expect(initial.rates[0]).toMatchObject({
            rateId: draft.draftRates![0].id,
            submittedInThisEvent: true,
        })
        const revision = await client.contractRevisionTable.findUniqueOrThrow({
            where: { id: first.revisions[0].id },
        })
        expect(initial.submissionId).toBe(revision.submitInfoID)
        // Repeating capture cannot replace the persisted event ID/body.
        await client.$transaction((tx) =>
            captureSubmissionEvent(tx, first, stage)
        )
        expect(await eventsFor(draft.id)).toEqual([initialRow])

        must(
            await store.unlockContract({
                contractID: draft.id,
                unlockedByUserID: user.id,
                unlockReason: 'prepare resubmission',
            })
        )
        expect(await eventsFor(draft.id)).toHaveLength(1) // Unlock is not an event.
        const second = must(
            await store.submitContract({
                contractID: draft.id,
                submittedByUserID: user.id,
                submittedReason: 'resubmission',
            })
        )
        const rows = await eventsFor(draft.id)
        expect(rows).toHaveLength(2)
        const resubmission = contractSubmissionEventSchema.parse(rows[1].event)
        expect(resubmission).toMatchObject({
            eventType: 'contract.resubmitted',
            contractId: draft.id,
            contractRevisionId: second.revisions[0].id,
        })
        expect(resubmission.eventId).not.toBe(initial.eventId)
        expect(resubmission.submissionId).not.toBe(initial.submissionId)
    })

    it('captures independent rate resubmission without inventing a contract submission', async () => {
        const { client, store, user, draft } = await draftPackage()
        const first = must(
            await store.submitContract({
                contractID: draft.id,
                submittedByUserID: user.id,
                submittedReason: 'initial',
            })
        )
        const rateId = draft.draftRates![0].id
        must(
            await store.unlockRate({
                rateID: rateId,
                unlockedByUserID: user.id,
                unlockReason: 'rate-only change',
            })
        )
        const submitted = must(
            await store.submitRate({
                rateID: rateId,
                submittedByUserID: user.id,
                submittedReason: 'rate resubmission',
            })
        )
        const rows = await client.submissionEventOutbox.findMany({
            where: { stage, event: { path: ['rateId'], equals: rateId } },
        })
        expect(rows).toHaveLength(1)
        const event = rateSubmissionEventSchema.parse(rows[0].event)
        expect(event).toMatchObject({
            eventType: 'rate.resubmitted',
            rateId,
            rateRevisionId: submitted.revisions[0].id,
        })
        expect(event.contracts).toEqual([
            { contractId: draft.id, contractRevisionId: first.revisions[0].id },
        ])
        expect(await eventsFor(draft.id)).toHaveLength(1)
    })

    it('rolls back contract/rate submission if outbox insertion fails', async () => {
        const { client, store, user, draft } = await draftPackage()
        const failingClient = client.$extends({
            query: {
                submissionEventOutbox: {
                    upsert() {
                        throw new Error('Injected outbox failure')
                    },
                },
            },
        }) as unknown as ExtendedPrismaClient
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const result = await submitContract(failingClient, {
            contractID: draft.id,
            submittedByUserID: user.id,
            submittedReason: 'must roll back',
        })
        expect(result).toBeInstanceOf(Error)
        const persisted = must(await store.findContractWithHistory(draft.id))
        expect(persisted.status).toBe('DRAFT')
        expect(persisted.revisions).toHaveLength(0)
        expect(persisted.draftRevision?.submitInfo).toBeUndefined()
        expect(persisted.draftRates![0].status).toBe('DRAFT')
        expect(await eventsFor(draft.id)).toHaveLength(0)
    })

    it('does not access the outbox when publishing is disabled', async () => {
        const { client, user, draft } = await draftPackage()
        vi.stubEnv('SUBMISSION_EVENTS_POC_ENABLED', 'false')
        const outboxWrite = vi.fn(() => {
            throw new Error('Outbox must remain unused')
        })
        const guardedClient = client.$extends({
            query: { submissionEventOutbox: { upsert: outboxWrite } },
        }) as unknown as ExtendedPrismaClient
        const result = must(
            await submitContract(guardedClient, {
                contractID: draft.id,
                submittedByUserID: user.id,
                submittedReason: 'disabled POC',
            })
        )
        expect(result.status).toBe('SUBMITTED')
        expect(outboxWrite).not.toHaveBeenCalled()
        expect(await eventsFor(draft.id)).toHaveLength(0)
    })
})
