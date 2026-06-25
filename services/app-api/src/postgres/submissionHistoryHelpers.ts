import type {
    AdminUserType,
    CMSUsersUnionType,
    ContractType,
    RateType,
    StateUserType,
} from '../domain-models'
import type {
    CompleteHistory,
    ContractSubmissionHistoryActionType,
    ContractSubmissionHistoryEntry,
    QuestionResponseHistoryActionType,
    QuestionResponseHistory,
    RateSubmissionHistoryActionType,
    RateSubmissionHistoryEntry,
} from '../domain-models'
import { logError } from '../logger'

type QuestionHistoryType = 'CONTRACT' | 'RATE'

type QuestionHistoryActionInput = {
    createdAt: Date
    action: 'DELETE' | 'RESTORE'
    reason: string
    updatedBy: AdminUserType
}

type QuestionHistoryResponseInput = {
    createdAt: Date
    addedBy: StateUserType
    actions: QuestionHistoryActionInput[]
}

type QuestionHistoryInput = {
    createdAt: Date
    addedBy: CMSUsersUnionType
    actions: QuestionHistoryActionInput[]
    responses: QuestionHistoryResponseInput[]
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
function actionTypeSortRank(
    actionType:
        | ContractSubmissionHistoryActionType
        | RateSubmissionHistoryActionType
        | QuestionResponseHistoryActionType
): number {
    switch (actionType) {
        case 'OVERRIDE':
            return 4
        case 'UNDER_REVIEW':
        case 'NOT_SUBJECT_TO_REVIEW':
        case 'MARK_AS_APPROVED':
        case 'WITHDRAW':
        case 'CONTRACT_QUESTION_DELETE':
        case 'CONTRACT_QUESTION_RESTORE':
        case 'CONTRACT_QUESTION_RESPONSE_DELETE':
        case 'CONTRACT_QUESTION_RESPONSE_RESTORE':
        case 'RATE_QUESTION_DELETE':
        case 'RATE_QUESTION_RESTORE':
        case 'RATE_QUESTION_RESPONSE_DELETE':
        case 'RATE_QUESTION_RESPONSE_RESTORE':
            return 3
        case 'CONTRACT_QUESTION_RESPONSE':
        case 'RATE_QUESTION_RESPONSE':
            return 2
        case 'RATE_LINK':
        case 'RATE_UNLINK':
        case 'CONTRACT_SUBMISSION':
        case 'LINKED_RATE_UPDATE':
        case 'RATE_SUBMISSION':
            return 2
        case 'CONTRACT_QUESTION':
        case 'RATE_QUESTION':
            return 1
        case 'UNLOCK':
            return 1
        default:
            return 0
    }
}

function sortHistory<TEntry extends CompleteHistory>(
    historyLog: TEntry[]
): TEntry[] {
    return [...historyLog].sort(
        (a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime() ||
            actionTypeSortRank(b.actionType) - actionTypeSortRank(a.actionType)
    )
}

function buildCompleteHistory<THistoryLogs extends CompleteHistory[][]>(
    historyLogs: THistoryLogs
): THistoryLogs[number][number][] {
    return sortHistory(historyLogs.flat()) as THistoryLogs[number][number][]
}

/**
 * Reconstructs the contract's submission action history from already-parsed
 * domain data, returning one entry per direct contract submission,
 * already-linked rate data update, direct unlock, review action, and override,
 * sorted newest-first.
 *
 * This reads from the parsed ContractType rather than the DB so it can run on
 * the in-transaction result a store function just produced.
 */
function buildContractSubmissionHistory(
    contract: ContractType
): ContractSubmissionHistoryEntry[] {
    const historyLog: ContractSubmissionHistoryEntry[] = []

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
            // later rate-link/linked-rate-update package snapshot does not
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
        // This branch only handles linked rate data updates, so keep rate revisions.
        const connectedSubmittedRates = connectedSubmittedRateRevisions.filter(
            (revision) => 'rateID' in revision
        )

        if (!previousPackageSubmission) {
            logError(
                'buildContractSubmissionHistory',
                `Contract ${contract.id} has a non-contract package submission ${packageSubmission.contractRevision.id} with connected submitted rates but no previous package submission; skipping ambiguous linked rate update history`
            )
            continue
        }

        // Add one LINKED_RATE_UPDATE entry when any submitted linked rate was
        // already attached in the previous package snapshot. For contract
        // history, this means linked rate data changed while the rate remained
        // linked; it is not a link or unlink event. A single package submission
        // comes from one parent submit event, so multiple linked rates here
        // should have been submitted together by the same parent contract. We
        // log the parent submit event once, not once per linked rate. If none
        // of the submitted rates existed on the previous package snapshot, the
        // resolver would call this RATE_LINK; that is relationship-only history
        // until the current contract submits the new relationship, so this
        // action log skips it.
        const wasAnyRateAlreadyLinked = connectedSubmittedRates.some(
            (submittedRate) =>
                previousPackageSubmission.rateRevisions.some(
                    (rateRevision) =>
                        rateRevision.rateID === submittedRate.rateID
                )
        )

        if (wasAnyRateAlreadyLinked) {
            historyLog.push({
                actionType: 'LINKED_RATE_UPDATE',
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
    return sortHistory(historyLog)
}

function buildQuestionResponseHistory(
    questions: QuestionHistoryInput[],
    questionHistoryType: QuestionHistoryType
): QuestionResponseHistory[] {
    const historyLog: QuestionResponseHistory[] = []

    for (const question of questions) {
        historyLog.push({
            actionType: `${questionHistoryType}_QUESTION`,
            updatedAt: question.createdAt,
            updatedBy: question.addedBy,
        })

        // Question actions are direct admin lifecycle changes on the question.
        // History input should exclude cascade actions so a parent delete does
        // not create duplicate document/response cascade entries in this log.
        for (const action of question.actions) {
            historyLog.push({
                actionType: `${questionHistoryType}_QUESTION_${action.action}`,
                updatedAt: action.createdAt,
                updatedBy: action.updatedBy,
                updatedReason: action.reason,
            })
        }

        for (const response of question.responses) {
            historyLog.push({
                actionType: `${questionHistoryType}_QUESTION_RESPONSE`,
                updatedAt: response.createdAt,
                updatedBy: response.addedBy,
            })

            // Response actions are direct admin lifecycle changes on a
            // response. Cascade response actions are intentionally skipped by
            // the store query because the parent question action is the
            // user-visible event.
            for (const action of response.actions) {
                historyLog.push({
                    actionType: `${questionHistoryType}_QUESTION_RESPONSE_${action.action}`,
                    updatedAt: action.createdAt,
                    updatedBy: action.updatedBy,
                    updatedReason: action.reason,
                })
            }
        }
    }

    return sortHistory(historyLog)
}

/**
 * Reconstructs the rate's submission action history from already-parsed domain
 * data, returning one entry per submit / unlock / review / override action,
 * sorted newest-first. This is the rate-side mirror of
 * buildContractSubmissionHistory.
 *
 * This reads from the parsed RateType rather than the DB so it can run on the
 * in-transaction result a store function just produced. Callers use entry [0]
 * (the latest action) as the rate's lastActionDate.
 */
function buildRateSubmissionHistory(
    rate: RateType
): RateSubmissionHistoryEntry[] {
    const historyLog: RateSubmissionHistoryEntry[] = []

    for (const [
        index,
        packageSubmission,
    ] of rate.packageSubmissions.entries()) {
        const previousPackageSubmission = rate.packageSubmissions[index + 1]

        const submitInfo = packageSubmission.submitInfo

        // Package submissions are perspective history, not always a submission
        // of this rate's data. If the rate revision is in the set of revisions
        // stamped by this updateInfo row, this rate's submitted data changed.
        // Child rates usually get here through their parent contract's
        // submit/resubmit, not through an independent rate submission workflow.
        const isRateSubmission = packageSubmission.submittedRevisions.some(
            (revision) => revision.id === packageSubmission.rateRevision.id
        )

        if (isRateSubmission) {
            historyLog.push({
                actionType: 'RATE_SUBMISSION',
                updatedAt: submitInfo.updatedAt,
                updatedBy: submitInfo.updatedBy,
                updatedReason: submitInfo.updatedReason,
            })

            // For submitted rate revisions, the unlockInfo on this submitted
            // revision is the CMS action that opened this revision through the
            // parent contract unlock path. We only record it when this rate's
            // revision was submitted so a later
            // contract-link/contract-submission package snapshot does not
            // duplicate an old rate unlock.
            const unlockInfo = packageSubmission.rateRevision.unlockInfo
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

        // If this rate was not submitted, this package entry may still matter
        // because one or more submitted contracts include this rate. Find the
        // submitted contract revisions that are connected to this rate in this
        // package snapshot. Start from contractRevisions because that collection
        // is already typed as contract revisions; submittedRevisions is a mixed
        // contract/rate union.
        const submittedRevisionIDs = new Set(
            packageSubmission.submittedRevisions.map((revision) => revision.id)
        )
        const connectedSubmittedContracts =
            packageSubmission.contractRevisions.filter((contractRevision) =>
                submittedRevisionIDs.has(contractRevision.id)
            )

        if (connectedSubmittedContracts.length === 0) {
            // No connected submitted contract matches the resolver's
            // RATE_UNLINK package cause from the rate perspective. This rate did
            // not get a new revision, but submitted package history changed
            // because a contract removed the rate relationship.
            historyLog.push({
                actionType: 'RATE_UNLINK',
                updatedAt: submitInfo.updatedAt,
                updatedBy: submitInfo.updatedBy,
                updatedReason: submitInfo.updatedReason,
            })
            continue
        }

        if (!previousPackageSubmission) {
            logError(
                'buildRateSubmissionHistory',
                `Rate ${rate.id} has a non-rate package submission ${packageSubmission.rateRevision.id} with connected submitted contracts but no previous package submission; skipping ambiguous rate relationship history`
            )
            continue
        }

        // If any submitted related contract was already attached in the
        // previous package snapshot, the resolver would call this
        // CONTRACT_SUBMISSION from the rate perspective. That is contract-only
        // activity and does not change the rate's data or relationship set, so
        // rate history skips it. If none of the submitted contracts existed on
        // the previous package snapshot, the resolver would call this RATE_LINK.
        // We log that because a rate can gain submitted contract relationships
        // without a new rate revision.
        const wasAnyContractAlreadyLinked = connectedSubmittedContracts.some(
            (submittedContract) =>
                previousPackageSubmission.contractRevisions.some(
                    (contractRevision) =>
                        contractRevision.contract.id ===
                        submittedContract.contract.id
                )
        )

        if (!wasAnyContractAlreadyLinked) {
            historyLog.push({
                actionType: 'RATE_LINK',
                updatedAt: submitInfo.updatedAt,
                updatedBy: submitInfo.updatedBy,
                updatedReason: submitInfo.updatedReason,
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
    return sortHistory(historyLog)
}

export {
    buildCompleteHistory,
    buildContractSubmissionHistory,
    buildQuestionResponseHistory,
    buildRateSubmissionHistory,
}

export type {
    CompleteHistory,
    ContractSubmissionHistoryEntry,
    ContractSubmissionHistoryActionType,
    QuestionHistoryActionInput,
    QuestionHistoryInput,
    QuestionHistoryResponseInput,
    QuestionResponseHistoryActionType,
    QuestionResponseHistory,
    RateSubmissionHistoryEntry,
    RateSubmissionHistoryActionType,
}
