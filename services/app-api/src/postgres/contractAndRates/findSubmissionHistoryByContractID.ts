import type { CompleteHistory, SubmissionHistory } from '../../domain-models'
import { findContractQuestionResponseHistory } from '../questionResponse'
import { findRateQuestionResponseHistory } from '../questionResponse'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    buildCompleteHistory,
    buildContractSubmissionHistory,
} from '../submissionHistoryHelpers'
import { findContractWithHistory } from './findContractWithHistory'
import { findRateWithHistory } from './findRateWithHistory'

/**
 * Builds the explicit submission history for a contract.
 *
 * This is broader than buildContractSubmissionHistory because the frontend view
 * also needs Q&A plus rate-owned events that change submitted-visible data for
 * this contract. We intentionally keep this as an explicit store query instead
 * of a Contract field resolver because linked rate Q&A/override history needs
 * extra rate fetches and relationship-window filtering.
 *
 * Rate submission history is not merged wholesale. From the contract
 * perspective, rate link/unlink and linked-rate resubmits are already
 * represented by this contract's package timeline. The only rate-owned events
 * added here are rate overrides and rate Q&A, and only while the rate appears
 * in this contract's submitted package history.
 */
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
    // package history. Draft-only rate links/unlinks are intentionally ignored:
    // CMS users only see submitted package data, so draft-only relationships
    // should not create contract history or move contract freshness.
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
    const attachedWindowsByRateID = new Map<
        string,
        {
            start: Date
            end?: Date
        }[]
    >()
    const oldestToNewestContractPackages = [
        ...contractWithHistory.packageSubmissions,
    ].reverse()

    // Use this contract's submitted package snapshots as the source of truth
    // for when each rate was visible through this contract. This is the main
    // reason we do not derive windows from rate package submissions: rate
    // package history is rate-wide and can include parent submits or unrelated
    // linked contracts, while this query needs a contract-scoped view.
    for (const rateID of rateIDs) {
        const attachedWindows: {
            start: Date
            end?: Date
        }[] = []
        let currentAttachedWindowStart: Date | undefined

        // A contract can link a rate, delink it, then link it again. Each
        // attached window represents a time range where rate-owned override/Q&A
        // actions should be visible in this contract's history.
        for (const packageSubmission of oldestToNewestContractPackages) {
            const isRateAttachedToContract =
                packageSubmission.rateRevisions.some(
                    (rateRevision) => rateRevision.rateID === rateID
                )

            if (isRateAttachedToContract && !currentAttachedWindowStart) {
                // The rate first appeared in this contract's submitted package,
                // or it reappeared after a previous delink gap.
                currentAttachedWindowStart =
                    packageSubmission.submitInfo.updatedAt
            }

            if (!isRateAttachedToContract && currentAttachedWindowStart) {
                // The rate disappeared from this contract's submitted package.
                // The end is exclusive so the contract submit that removed the
                // relationship is represented by the contract submission entry,
                // not duplicated as rate override/Q&A history.
                attachedWindows.push({
                    start: currentAttachedWindowStart,
                    end: packageSubmission.submitInfo.updatedAt,
                })
                currentAttachedWindowStart = undefined
            }
        }

        if (currentAttachedWindowStart) {
            // No later contract package removed this rate, so rate-level events
            // remain visible through this contract after the start timestamp.
            attachedWindows.push({
                start: currentAttachedWindowStart,
            })
        }

        attachedWindowsByRateID.set(rateID, attachedWindows)
    }

    const contractScopedRateHistory: CompleteHistory[] = []

    // Rate overrides and rate Q&A can change what CMS sees on this contract
    // without creating a new contract package submission. Do not merge
    // buildRateSubmissionHistory here: rate submit/link/unlink/unlock/review
    // entries are either represented by this contract's package history or are
    // not contract-scoped enough for this view. Only rate-owned override and
    // Q&A entries are added below, filtered to the windows where the rate was
    // attached here.
    for (const rateID of rateIDs) {
        const rateWithHistory = await findRateWithHistory(client, rateID)

        if (rateWithHistory instanceof Error) {
            return rateWithHistory
        }

        // These windows were derived from the contract package timeline above.
        // The rate fetch is only for rate-owned events; it should not redefine
        // whether the rate belonged to this contract.
        const attachedWindows = attachedWindowsByRateID.get(rateID) ?? []

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

        for (const rateQuestionHistoryEntry of rateQuestionHistory) {
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

    const history = buildCompleteHistory([
        // Contract submission history includes submit/unlock/review, contract
        // overrides, and linked-rate package updates that already exist in this
        // contract's package timeline.
        buildContractSubmissionHistory(contractWithHistory),
        // Contract Q&A is always contract-scoped, so it does not need the
        // relationship-window filtering used for rate Q&A.
        questionHistory,
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
