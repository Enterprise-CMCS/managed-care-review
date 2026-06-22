import type {
    ContractType,
    RateType,
    UpdateInfoType,
} from '../../domain-models'
import type { ReviewActionTypes } from '../../domain-models/contractAndRates/contractReviewActionType'

// A single contract- or rate-level lifecycle event we care about for
// "freshness" — the actions that should move a contract's or rate's
// lastActionDate: every submit, every unlock, every review status action, every
// admin data override, and contract-visible linked rate submissions. Q&A is
// intentionally out of scope (handled separately). The contract and rate
// builders below share this entry shape; the rate review action types
// (UNDER_REVIEW / WITHDRAW) are a subset of the contract ones, so the union
// below covers both sides.
type SubmissionHistoryActionType =
    | 'CONTRACT_SUBMISSION'
    | 'RATE_SUBMISSION'
    | 'UNLOCK'
    | 'OVERRIDE'
    | ReviewActionTypes

type SubmissionHistoryLogEntry = {
    actionType: SubmissionHistoryActionType
    updatedAt: Date
    updatedBy?: UpdateInfoType['updatedBy']
    updatedReason?: string
}

/**
 * Same-millisecond tie-breaker for action log sorting.
 *
 * The primary sort is still `updatedAt` descending. This rank only applies when
 * two action rows collapse to the same JS millisecond, which can happen when a
 * submit and its follow-up automated review determination are created in the
 * same DB transaction.
 *
 * The rank follows lifecycle order:
 * - overrides are explicit corrections to submitted data and should win ties
 * - review actions can be created after submit, so they sort above submit
 * - contract/rate submissions sort above the unlock that opened the revision
 * - unlocks are the earliest action in a normal unlock -> submit lifecycle
 */
function actionTypeSortRank(actionType: SubmissionHistoryActionType): number {
    switch (actionType) {
        case 'OVERRIDE':
            return 4
        case 'UNDER_REVIEW':
        case 'NOT_SUBJECT_TO_REVIEW':
        case 'MARK_AS_APPROVED':
        case 'WITHDRAW':
            return 3
        case 'CONTRACT_SUBMISSION':
        case 'RATE_SUBMISSION':
            return 2
        case 'UNLOCK':
            return 1
        default:
            return 0
    }
}

/**
 * Reconstructs the contract's submission action history from already-parsed
 * domain data, returning one entry per direct contract submission,
 * already-linked rate submission, direct unlock, review action, and override,
 * sorted newest-first.
 *
 * This reads from the parsed ContractType rather than the DB so it can run on
 * the in-transaction result a store function just produced.
 */
function buildContractSubmissionHistoryLog(
    contract: ContractType
): SubmissionHistoryLogEntry[] {
    const historyLog: SubmissionHistoryLogEntry[] = []

    // Parse packageSubmission for submit and unlock logs
    for (const [
        index,
        packageSubmission,
    ] of contract.packageSubmissions.entries()) {
        const previousPackageSubmission = contract.packageSubmissions[index + 1]

        const submitInfo = packageSubmission.submitInfo

        // Package submissions are perspective history, not always this
        // contract's own submit. If the contract revision is in the set of
        // revisions stamped by this updateInfo row, this entry is a direct
        // contract submit/resubmit and should be logged as CONTRACT_SUBMISSION.
        const isContractSubmission = packageSubmission.submittedRevisions.some(
            (revision) => revision.id === packageSubmission.contractRevision.id
        )

        if (isContractSubmission) {
            historyLog.push({
                actionType: 'CONTRACT_SUBMISSION',
                updatedAt: submitInfo.updatedAt,
                updatedBy: submitInfo.updatedBy,
                updatedReason: submitInfo.updatedReason,
            })

            // For direct contract resubmissions, the unlockInfo on this
            // submitted revision is the CMS unlock action that opened this
            // revision. We only record it on direct contract submissions so a
            // later rate-link/rate-submission package snapshot does not
            // duplicate an old contract unlock.
            const unlockInfo = packageSubmission.contractRevision.unlockInfo
            if (unlockInfo) {
                historyLog.push({
                    actionType: 'UNLOCK',
                    updatedAt: unlockInfo.updatedAt,
                    updatedBy: unlockInfo.updatedBy,
                    updatedReason: unlockInfo.updatedReason,
                })
            }

            continue
        }

        // If this contract was not submitted, this package entry may still
        // matter because one or more rates linked to this contract were
        // resubmitted by their parent. Find the submitted rate revisions that
        // are connected to this contract in this package snapshot.
        const connectedSubmittedRateRevisions =
            packageSubmission.submittedRevisions.filter((revision) =>
                packageSubmission.rateRevisions.some(
                    (rateRevision) => rateRevision.id === revision.id
                )
            )

        if (connectedSubmittedRateRevisions.length === 0) {
            // No connected submitted rate matches the resolver's RATE_UNLINK
            // package cause. A link/unlink only changes the contract-rate
            // relationship until the current contract is resubmitted; that
            // direct resubmit is what captures submitted contract data changing.
            // This log is for submitted data changes, so relationship-only
            // package events are intentionally skipped.
            continue
        }

        // Type guard: submittedRevisions can contain contract or rate revisions.
        // This branch only handles linked rate submissions, so keep rate revisions.
        const connectedSubmittedRates = connectedSubmittedRateRevisions.filter(
            (revision) => 'rateID' in revision
        )

        // Add one RATE_SUBMISSION entry when any submitted linked rate was
        // already attached in the previous package snapshot. A single package
        // submission comes from one parent submit event, so multiple linked
        // rates here should have been submitted together by the same parent
        // contract. We log the parent submit event once, not once per linked
        // rate. If none of the submitted rates existed on the previous package
        // snapshot, the resolver would call this RATE_LINK; that is also
        // relationship-only history until the current contract submits the new
        // relationship, so this action log skips it.
        const wasAnyRateAlreadyLinked = connectedSubmittedRates.some(
            (submittedRate) =>
                previousPackageSubmission?.rateRevisions.some(
                    (rateRevision) =>
                        rateRevision.rateID === submittedRate.rateID
                ) ?? false
        )

        if (wasAnyRateAlreadyLinked) {
            historyLog.push({
                actionType: 'RATE_SUBMISSION',
                updatedAt: submitInfo.updatedAt,
                updatedBy: submitInfo.updatedBy,
                updatedReason: submitInfo.updatedReason,
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
    // action regardless of which collection it came from. Some DB writes can
    // collapse to the same JS millisecond, so use a semantic tie-breaker:
    // automated review determinations are created after their submit, and a
    // submit is created after its unlock.
    return [...historyLog].sort(
        (a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime() ||
            actionTypeSortRank(b.actionType) - actionTypeSortRank(a.actionType)
    )
}

/**
 * Reconstructs the rate's submission action history from already-parsed domain
 * data, returning one entry per submit / unlock / review / override action,
 * sorted newest-first. This is the rate-side mirror of
 * buildContractSubmissionHistoryLog.
 *
 * This reads from the parsed RateType rather than the DB so it can run on the
 * in-transaction result a store function just produced. Callers use entry [0]
 * (the latest action) as the rate's lastActionDate.
 */
function buildRateSubmissionHistoryLog(
    rate: RateType
): SubmissionHistoryLogEntry[] {
    const historyLog: SubmissionHistoryLogEntry[] = []

    // Each packageSubmission is one submitted revision of the rate. The
    // submitInfo is its submit event; the same revision's unlockInfo (when
    // present) is the unlock that opened that revision before it was submitted.
    // Order doesn't matter here because the log is sorted by updatedAt below.
    for (const packageSubmission of rate.packageSubmissions) {
        const submitInfo = packageSubmission.submitInfo
        historyLog.push({
            actionType: 'RATE_SUBMISSION',
            updatedAt: submitInfo.updatedAt,
            updatedBy: submitInfo.updatedBy,
            updatedReason: submitInfo.updatedReason,
        })

        const unlockInfo = packageSubmission.rateRevision.unlockInfo
        if (unlockInfo) {
            historyLog.push({
                actionType: 'UNLOCK',
                updatedAt: unlockInfo.updatedAt,
                updatedBy: unlockInfo.updatedBy,
                updatedReason: unlockInfo.updatedReason,
            })
        }
    }

    // A currently-unlocked rate has its in-flight unlock on the draft revision,
    // which is not yet in packageSubmissions because it hasn't been resubmitted.
    // We still capture it so the unlock counts as the latest action. It moves
    // into the packageSubmissions loop above once the revision is resubmitted.
    const draftUnlockInfo = rate.draftRevision?.unlockInfo
    if (draftUnlockInfo) {
        historyLog.push({
            actionType: 'UNLOCK',
            updatedAt: draftUnlockInfo.updatedAt,
            updatedBy: draftUnlockInfo.updatedBy,
            updatedReason: draftUnlockInfo.updatedReason,
        })
    }

    // Rate review status actions (under review / withdraw) are tracked
    // separately from revisions but are still rate-level events that count
    // toward freshness.
    for (const reviewAction of rate.reviewStatusActions ?? []) {
        historyLog.push({
            actionType: reviewAction.actionType,
            updatedAt: reviewAction.updatedAt,
            updatedBy: reviewAction.updatedBy,
            updatedReason: reviewAction.updatedReason,
        })
    }

    // Admin data overrides are append-only correction events on submitted data.
    // Each override row is a distinct, timestamped rate mutation, so it counts
    // toward freshness. We map its createdAt/description to the entry's
    // updatedAt/updatedReason.
    for (const override of rate.rateOverrides ?? []) {
        historyLog.push({
            actionType: 'OVERRIDE',
            updatedAt: override.createdAt,
            updatedBy: override.updatedBy,
            updatedReason: override.description,
        })
    }

    // Sort descending by timestamp so entry [0] is always the most recent
    // action regardless of which collection it came from. Use the same
    // tie-breaker as the contract builder for same-millisecond writes.
    return [...historyLog].sort(
        (a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime() ||
            actionTypeSortRank(b.actionType) - actionTypeSortRank(a.actionType)
    )
}

export { buildContractSubmissionHistoryLog, buildRateSubmissionHistoryLog }

export type { SubmissionHistoryLogEntry, SubmissionHistoryActionType }
