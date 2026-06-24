import type { CompleteHistory, SubmissionHistory } from '../../domain-models'
import { findContractQuestionResponseHistory } from '../questionResponse/findContractQuestionResponseHistory'
import { findRateQuestionResponseHistory } from '../questionResponse/findRateQuestionResponseHistory'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    buildCompleteHistoryLog,
    buildContractSubmissionHistoryLog,
    buildQuestionResponseHistoryLog,
} from '../submissionHistoryHelpers'
import { findContractWithHistory } from './findContractWithHistory'
import { findRateWithHistory } from './findRateWithHistory'

async function findSubmissionHistoryByContractID(
    client: ExtendedPrismaClient,
    contractID: string
): Promise<SubmissionHistory | Error> {
    const contractWithHistory = await findContractWithHistory(
        client,
        contractID
    )

    if (contractWithHistory instanceof Error) {
        return contractWithHistory
    }

    // Contract Q&A is fetched separately from findContractWithHistory because
    // the history view needs deleted question/response actions that normal
    // display queries intentionally hide.
    const questionHistory = await findContractQuestionResponseHistory(
        client,
        contractID
    )

    if (questionHistory instanceof Error) {
        return questionHistory
    }

    // Only inspect rates that have appeared in this contract's submitted
    // package history. Draft-only links are intentionally ignored because CMS
    // users do not see draft relationship changes and they should not affect
    // submission history.
    const rateIDs = [
        ...new Set(
            contractWithHistory.packageSubmissions.flatMap(
                (packageSubmission) =>
                    packageSubmission.rateRevisions.map(
                        (rateRevision) => rateRevision.rateID
                    )
            )
        ),
    ]
    const contractScopedRateHistory: CompleteHistory[] = []

    // Rate overrides and rate Q&A can change what CMS sees on this contract
    // without creating a new contract package submission. Fetch the full rate
    // history for rates that have appeared in this contract's submitted
    // packages, then filter those rate events to the windows where the rate was
    // attached here.
    for (const rateID of rateIDs) {
        const rateWithHistory = await findRateWithHistory(client, rateID)

        if (rateWithHistory instanceof Error) {
            return rateWithHistory
        }

        // A contract can link a rate, delink it, then link it again. Store each
        // attached time range separately and use these ranges below to decide
        // whether rate override/Q&A timestamps should appear in this contract's
        // history.
        const attachedWindows: {
            start: Date
            end?: Date
        }[] = []
        let currentAttachedWindowStart: Date | undefined
        const oldestToNewestRatePackages = [
            ...rateWithHistory.packageSubmissions,
        ].reverse()

        // Rate package submissions are submitted snapshots of all contracts
        // related to the rate. Walking oldest-to-newest lets us derive
        // attachment windows for this contract: start when the contract appears,
        // end when it disappears.
        for (const packageSubmission of oldestToNewestRatePackages) {
            const isAttachedToContract =
                packageSubmission.contractRevisions.some(
                    (contractRevision) =>
                        contractRevision.contract.id === contractWithHistory.id
                )

            if (isAttachedToContract && !currentAttachedWindowStart) {
                // The contract became attached to this rate in a submitted
                // package, so rate-level events after this timestamp can be
                // visible through this contract.
                currentAttachedWindowStart =
                    packageSubmission.submitInfo.updatedAt
            }

            if (!isAttachedToContract && currentAttachedWindowStart) {
                // The contract disappeared from this rate's submitted
                // relationship set. Use this package timestamp as an exclusive
                // end boundary so the unlinking contract submit itself is not
                // duplicated as rate Q&A/override history.
                attachedWindows.push({
                    start: currentAttachedWindowStart,
                    end: packageSubmission.submitInfo.updatedAt,
                })
                currentAttachedWindowStart = undefined
            }
        }

        if (currentAttachedWindowStart) {
            // No later package removed this contract, so the attachment window
            // is still open.
            attachedWindows.push({
                start: currentAttachedWindowStart,
            })
        }

        // Rate overrides are direct data corrections. Include them only when
        // this contract was attached to the rate at the override timestamp. An
        // unlocked linked contract still shows CMS users the latest submitted
        // package data, so a linked rate override during that window is still a
        // submitted-data change for this contract's history.
        for (const override of rateWithHistory.rateOverrides ?? []) {
            const overrideWasVisibleOnContract = attachedWindows.some(
                (window) =>
                    override.createdAt >= window.start &&
                    (!window.end || override.createdAt < window.end)
            )

            if (overrideWasVisibleOnContract) {
                contractScopedRateHistory.push({
                    actionType: 'OVERRIDE',
                    updatedAt: override.createdAt,
                    updatedBy: override.updatedBy,
                    updatedReason: override.description,
                })
            }
        }

        // Rate Q&A is scoped to the rate, but it is relevant to this contract
        // while the rate is attached. Filter out entries from before the link or
        // after the unlink/withdraw package change.
        const rateQuestionHistory = await findRateQuestionResponseHistory(
            client,
            rateID
        )

        if (rateQuestionHistory instanceof Error) {
            return rateQuestionHistory
        }

        const rateQuestionHistoryLog = buildQuestionResponseHistoryLog(
            rateQuestionHistory,
            'RATE'
        )

        for (const rateQuestionHistoryEntry of rateQuestionHistoryLog) {
            // Reuse the same window check for every rate question, response, and
            // direct delete/restore action.
            const questionActionWasVisibleOnContract = attachedWindows.some(
                (window) =>
                    rateQuestionHistoryEntry.updatedAt >= window.start &&
                    (!window.end ||
                        rateQuestionHistoryEntry.updatedAt < window.end)
            )

            if (questionActionWasVisibleOnContract) {
                contractScopedRateHistory.push(rateQuestionHistoryEntry)
            }
        }
    }

    const history = buildCompleteHistoryLog([
        // Contract submission history includes submit/unlock/review, contract
        // overrides, and linked-rate package updates that already exist in this
        // contract's package timeline.
        buildContractSubmissionHistoryLog(contractWithHistory),
        // Contract Q&A is always contract-scoped, so it does not need the
        // relationship-window filtering used for rate Q&A.
        buildQuestionResponseHistoryLog(questionHistory, 'CONTRACT'),
        // Rate overrides and rate Q&A are included only after the per-rate
        // attachment-window filtering above.
        contractScopedRateHistory,
    ])

    return {
        contractID: contractWithHistory.id,
        stateCode: contractWithHistory.stateCode,
        history,
    }
}

export { findSubmissionHistoryByContractID }
