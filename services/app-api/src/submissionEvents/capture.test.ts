import type { ContractType, RateType } from '../domain-models'
import type { PrismaTransactionType } from '../postgres/prismaTypes'
import { captureSubmissionEvent, captureRateSubmissionEvent } from './capture'

const contractId = '33333333-3333-4333-8333-333333333333'
const revisionId = '44444444-4444-4444-8444-444444444444'
const submissionId = '22222222-2222-4222-8222-222222222222'

function fixture(status = 'SUBMITTED', role = 'STATE_USER') {
    const contract = {
        id: contractId,
        status,
        revisions: [{ id: revisionId, submitInfo: { updatedBy: { role } } }],
    } as unknown as ContractType
    const upsert = vi.fn().mockResolvedValue({})
    const query = vi.fn().mockResolvedValue({
        id: revisionId,
        contractID: contractId,
        submitInfo: {
            id: submissionId,
            updatedAt: new Date('2026-10-01T12:00:00Z'),
            submissionPackages: [
                {
                    rateRevision: {
                        id: '66666666-6666-4666-8666-666666666666',
                        rateID: '55555555-5555-4555-8555-555555555555',
                        submitInfoID: submissionId,
                    },
                },
                {
                    rateRevision: {
                        id: '77777777-7777-4777-8777-777777777777',
                        rateID: '88888888-8888-4888-8888-888888888888',
                        submitInfoID: 'another-submission',
                    },
                },
            ],
        },
    })
    const tx = {
        contractRevisionTable: { findUniqueOrThrow: query },
        submissionEventOutbox: { upsert },
    } as unknown as PrismaTransactionType
    return { contract, tx, upsert, query }
}

describe('captureRateSubmissionEvent', () => {
    it('captures a rate-only occurrence and associated contract revision references', async () => {
        const rate = {
            revisions: [
                {
                    id: revisionId,
                    submitInfo: { updatedBy: { role: 'STATE_USER' } },
                },
            ],
        } as unknown as RateType
        const upsert = vi.fn().mockResolvedValue({})
        const findUniqueOrThrow = vi.fn().mockResolvedValue({
            id: revisionId,
            rateID: contractId,
            submitInfo: {
                id: submissionId,
                updatedAt: new Date('2026-10-01T12:00:00Z'),
                submissionPackages: [
                    {
                        contractRevision: {
                            id: '77777777-7777-4777-8777-777777777777',
                            contractID: '88888888-8888-4888-8888-888888888888',
                        },
                    },
                ],
            },
        })
        const tx = {
            rateRevisionTable: { findUniqueOrThrow },
            submissionEventOutbox: { upsert },
        } as unknown as PrismaTransactionType
        await captureRateSubmissionEvent(tx, rate, 'poc-events')
        expect(upsert.mock.calls[0][0].create.event).toMatchObject({
            eventType: 'rate.resubmitted',
            rateId: contractId,
            rateRevisionId: revisionId,
            contracts: [
                {
                    contractId: '88888888-8888-4888-8888-888888888888',
                    contractRevisionId: '77777777-7777-4777-8777-777777777777',
                },
            ],
        })
        expect(
            findUniqueOrThrow.mock.calls[0][0].select.submitInfo.select
                .submissionPackages.where
        ).toEqual({ rateRevisionID: revisionId })
        upsert.mockRejectedValue(new Error('outbox unavailable'))
        await expect(
            captureRateSubmissionEvent(tx, rate, 'poc-events')
        ).rejects.toThrow('outbox unavailable')
    })
})

describe('captureSubmissionEvent', () => {
    it.each(['SUBMITTED', 'RESUBMITTED'])(
        'captures a %s package using the caller transaction',
        async (status) => {
            const { contract, tx, upsert } = fixture(status)
            await captureSubmissionEvent(tx, contract, 'poc-events')
            const args = upsert.mock.calls[0][0]
            expect(args.where).toEqual({
                stage_submissionID: {
                    stage: 'poc-events',
                    submissionID: submissionId,
                },
            })
            expect(args.update).toEqual({})
            expect(args.create.id).toBe(args.create.event.eventId)
            expect(args.create.event).toMatchObject({
                contractId,
                contractRevisionId: revisionId,
                submissionId,
                eventType:
                    status === 'SUBMITTED'
                        ? 'contract.submitted'
                        : 'contract.resubmitted',
            })
            expect(
                args.create.event.rates.map(
                    (rate: { submittedInThisEvent: boolean }) =>
                        rate.submittedInThisEvent
                )
            ).toEqual([true, false])
            expect(Object.keys(args.create.event)).not.toContain('formData')
        }
    )
    it('does not capture composed CMS/admin submission workflows', async () => {
        const { contract, tx, upsert, query } = fixture('SUBMITTED', 'CMS_USER')
        await captureSubmissionEvent(tx, contract, 'poc-events')
        expect(upsert).not.toHaveBeenCalled()
        expect(query).not.toHaveBeenCalled()
    })
    it('propagates outbox failure so the caller transaction rolls back', async () => {
        const { contract, tx, upsert } = fixture()
        upsert.mockRejectedValue(new Error('outbox unavailable'))
        await expect(
            captureSubmissionEvent(tx, contract, 'poc-events')
        ).rejects.toThrow('outbox unavailable')
    })
    it('does not create an event when the submitted revision lookup fails', async () => {
        const { contract, tx, upsert, query } = fixture()
        query.mockRejectedValue(new Error('revision missing'))
        await expect(
            captureSubmissionEvent(tx, contract, 'poc-events')
        ).rejects.toThrow('revision missing')
        expect(upsert).not.toHaveBeenCalled()
    })
})
