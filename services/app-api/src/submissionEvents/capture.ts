import { randomUUID } from 'node:crypto'
import type { ContractType, RateType } from '../domain-models'
import type { PrismaTransactionType } from '../postgres/prismaTypes'
import {
    contractSubmissionEventSchema,
    rateSubmissionEventSchema,
} from './event'

/** Called only by the outer submission transaction, not composed unlock/withdraw operations. */
export async function captureSubmissionEvent(
    tx: PrismaTransactionType,
    contract: ContractType,
    stage: string
): Promise<void> {
    const revision = contract.revisions[0]
    // State submissions only; do not turn internal CMS/admin workflows into events.
    if (revision?.submitInfo?.updatedBy.role !== 'STATE_USER') return

    const submittedRevision = await tx.contractRevisionTable.findUniqueOrThrow({
        where: { id: revision.id },
        select: {
            id: true,
            contractID: true,
            submitInfo: {
                select: {
                    id: true,
                    updatedAt: true,
                    submissionPackages: {
                        where: { contractRevisionID: revision.id },
                        orderBy: { ratePosition: 'asc' },
                        select: {
                            rateRevision: {
                                select: {
                                    id: true,
                                    rateID: true,
                                    submitInfoID: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    })
    const submission = submittedRevision.submitInfo
    if (!submission || submittedRevision.contractID !== contract.id) {
        throw new Error(
            'Cannot capture notification without a submitted contract revision'
        )
    }
    const event = contractSubmissionEventSchema.parse({
        envelopeVersion: 1,
        eventId: randomUUID(),
        source: 'stateportal',
        stage,
        eventType:
            contract.status === 'RESUBMITTED'
                ? 'contract.resubmitted'
                : 'contract.submitted',
        occurredAt: submission.updatedAt.toISOString(),
        submissionId: submission.id,
        contractId: contract.id,
        contractRevisionId: revision.id,
        rates: submission.submissionPackages.map(({ rateRevision }) => ({
            rateId: rateRevision.rateID,
            rateRevisionId: rateRevision.id,
            submittedInThisEvent: rateRevision.submitInfoID === submission.id,
        })),
    })
    // The unique stage/submission key prevents duplicate capture of a business submission.
    await tx.submissionEventOutbox.upsert({
        where: { stage_submissionID: { stage, submissionID: submission.id } },
        create: {
            id: event.eventId,
            stage,
            submissionID: submission.id,
            event,
        },
        update: {},
    })
}

/** Capture an independent state rate resubmission in its existing transaction. */
export async function captureRateSubmissionEvent(
    tx: PrismaTransactionType,
    rate: RateType,
    stage: string
): Promise<void> {
    const submittedRevision = rate.revisions[0]
    if (submittedRevision?.submitInfo?.updatedBy.role !== 'STATE_USER') return

    const revision = await tx.rateRevisionTable.findUniqueOrThrow({
        where: { id: submittedRevision.id },
        select: {
            id: true,
            rateID: true,
            submitInfo: {
                select: {
                    id: true,
                    updatedAt: true,
                    submissionPackages: {
                        where: { rateRevisionID: submittedRevision.id },
                        select: {
                            contractRevision: {
                                select: { id: true, contractID: true },
                            },
                        },
                        orderBy: { contractRevisionID: 'asc' },
                    },
                },
            },
        },
    })
    if (!revision.submitInfo)
        throw new Error('Submitted rate has no submit info')

    const event = rateSubmissionEventSchema.parse({
        envelopeVersion: 1,
        eventId: randomUUID(),
        source: 'stateportal',
        stage,
        eventType: 'rate.resubmitted',
        occurredAt: revision.submitInfo.updatedAt.toISOString(),
        submissionId: revision.submitInfo.id,
        rateId: revision.rateID,
        rateRevisionId: revision.id,
        contracts: revision.submitInfo.submissionPackages.map(
            ({ contractRevision }) => ({
                contractId: contractRevision.contractID,
                contractRevisionId: contractRevision.id,
            })
        ),
    })
    await tx.submissionEventOutbox.upsert({
        where: {
            stage_submissionID: { stage, submissionID: event.submissionId },
        },
        create: {
            id: event.eventId,
            stage,
            submissionID: event.submissionId,
            event,
        },
        update: {},
    })
}
