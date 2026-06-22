import type { ContractType, UpdateInfoType } from '../../domain-models'
import type { ReviewActionTypes } from '../../domain-models/contractAndRates/contractReviewActionType'

// A single contract lifecycle event we care about for "freshness". These are
// the contract-centric actions that should move a contract's lastActionDate:
// every submit, every unlock, every review status action (approve, reverse
// approve, under review, etc), and every admin data override. Q&A and rate-only
// changes are intentionally out of scope here — those are handled separately
// (rate-side will get its own builder).
//
// NOTE: undo-unlock is deliberately NOT its own action type. Reversing an unlock
// is a revert, not a new event: the reversed revision drops out of the parsed
// ContractType (it's neither the draft nor a submitted revision), so the latest
// remaining entry here is the prior submit/review action — which is exactly the
// date undo-unlock should revert lastActionDate to.
type SubmissionHistoryActionType =
    | 'SUBMIT'
    | 'UNLOCK'
    | 'OVERRIDE'
    | ReviewActionTypes

type SubmissionHistoryLogEntry = {
    actionType: SubmissionHistoryActionType
    updatedAt: Date
    // Who performed the action and the reason/description they gave. Submit and
    // unlock events always carry both; review status actions may have neither
    // (automated EQRO / health-plan determinations are created without a user
    // or reason), so both are optional on the entry.
    updatedBy?: UpdateInfoType['updatedBy']
    updatedReason?: string
}

/**
 * Reconstructs the contract's submission action history from already-parsed
 * domain data, returning one entry per submit / unlock / review / override
 * action, sorted newest-first.
 *
 * This reads from the parsed ContractType rather than the DB so it can run on
 * the in-transaction result a store function just produced. Callers use entry
 * [0] (the latest action) as the contract's lastActionDate.
 *
 * Undo-unlock is intentionally left out as its own action: it's a revert, not a
 * new event. The reversed revision drops out of the parsed ContractType (it's
 * neither the draft nor a submitted revision), so the latest remaining entry is
 * the prior submit/review action — exactly the date undo-unlock should revert
 * lastActionDate to.
 */
function buildContractSubmissionHistoryLog(
    contract: ContractType
): SubmissionHistoryLogEntry[] {
    const historyLog: SubmissionHistoryLogEntry[] = []

    // Each packageSubmission is one submitted revision of the contract. The
    // submitInfo is its submit event. The same revision's unlockInfo (when
    // present) is the unlock that opened that revision before it was submitted:
    // the initial submission has only a submitInfo, while every later revision
    // is unlocked first and then resubmitted. We record both events; their
    // relative order doesn't matter here because the log is sorted by updatedAt
    // below.
    for (const packageSubmission of contract.packageSubmissions) {
        const submitInfo = packageSubmission.submitInfo
        historyLog.push({
            actionType: 'SUBMIT',
            updatedAt: submitInfo.updatedAt,
            updatedBy: submitInfo.updatedBy,
            updatedReason: submitInfo.updatedReason,
        })

        const unlockInfo = packageSubmission.contractRevision.unlockInfo
        if (unlockInfo) {
            historyLog.push({
                actionType: 'UNLOCK',
                updatedAt: unlockInfo.updatedAt,
                updatedBy: unlockInfo.updatedBy,
                updatedReason: unlockInfo.updatedReason,
            })
        }
    }

    // A currently-unlocked contract has its in-flight unlock on the draft
    // revision, which is not yet in packageSubmissions because it hasn't been
    // resubmitted. We still capture it so the unlock counts as the latest action
    // (e.g. the unlock store function relies on this for the contract's
    // lastActionDate). It will move into the packageSubmissions loop above once
    // the revision is resubmitted. No de-dupe is needed: a draft unlock and a
    // submitted-revision unlock are distinct lifecycle states.
    const draftUnlockInfo = contract.draftRevision?.unlockInfo
    if (draftUnlockInfo) {
        historyLog.push({
            actionType: 'UNLOCK',
            updatedAt: draftUnlockInfo.updatedAt,
            updatedBy: draftUnlockInfo.updatedBy,
            updatedReason: draftUnlockInfo.updatedReason,
        })
    }

    // Review status actions (approve / reverse approve / under review / not
    // subject to review) are tracked separately from revisions but are still
    // contract-level events that count toward freshness.
    for (const reviewAction of contract.reviewStatusActions ?? []) {
        historyLog.push({
            actionType: reviewAction.actionType,
            updatedAt: reviewAction.updatedAt,
            updatedBy: reviewAction.updatedBy,
            updatedReason: reviewAction.updatedReason,
        })
    }

    // Admin data overrides are append-only correction events on submitted data.
    // Each override row is a distinct, timestamped contract mutation, so it
    // counts toward freshness. We map its createdAt/description to the entry's
    // updatedAt/updatedReason.
    for (const override of contract.contractOverrides ?? []) {
        historyLog.push({
            actionType: 'OVERRIDE',
            updatedAt: override.createdAt,
            updatedBy: override.updatedBy,
            updatedReason: override.description,
        })
    }

    // Sort descending by timestamp so entry [0] is always the most recent
    // action regardless of which collection it came from.
    return [...historyLog].sort(
        (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )
}

export { buildContractSubmissionHistoryLog }

export type { SubmissionHistoryLogEntry, SubmissionHistoryActionType }
