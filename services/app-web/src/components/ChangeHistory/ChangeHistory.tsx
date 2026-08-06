import React, { type JSX } from 'react'
import { dayjs } from '@mc-review/dates'
import { SectionHeader } from '../SectionHeader'
import { Accordion, type AccordionProps } from '@trussworks/react-uswds'
import {
    UpdateInformation,
    Contract,
    UnlockedContract,
    ContractReviewStatusActions,
    ContractPackageSubmission,
    ContractRevision,
    ContractSubmissionType,
    ContractUndoUnlockPackage,
} from '../../gen/gqlClient'
import styles from './ChangeHistory.module.scss'
import { LinkWithLogging } from '../TealiumLogging'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { useTealium } from '../../hooks'
import { formatToPacificTime } from '@mc-review/dates'
import {
    ContractSubmissionTypeRecord,
    ReviewDecisionRecord,
} from '@mc-review/constants'
import {
    eqroValidationAndReviewDetermination,
    healthPlanReviewDetermination,
    SubmissionStatusRecord,
} from '@mc-review/submissions'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'

type ChangeHistoryProps = {
    contract: Contract | UnlockedContract
}

type flatRevisions = Omit<UpdateInformation, 'updatedBy'> & {
    kind:
        | 'submit'
        | 'unlock'
        | 'undo_unlock'
        | 'review_update_approve'
        | 'review_update_withdraw'
        | 'review_update_submitted'
        | 'review_update_undo_approve'
        | 'submit_with_review'
    revisionVersion: string | undefined
    updatedBy?: UpdateInformation['updatedBy']
    reviewDecision?: string
}

const getPreviousSubmissionLink = ({
    contractSubmissionType,
    contractID,
    revisionVersion,
}: {
    contractSubmissionType: ContractSubmissionType
    contractID: string
    revisionVersion: string
}) => {
    const contractSubTypeParam =
        ContractSubmissionTypeRecord[contractSubmissionType]
    return `/submissions/${contractSubTypeParam}/${contractID}/revisions/${revisionVersion}`
}

const buildChangeHistoryInfo = (
    r: flatRevisions,
    contractSubmissionType: ContractSubmissionType,
    revisionHistory: flatRevisions[],
    contract: Contract | UnlockedContract
): { content: JSX.Element; title: string } => {
    const isInitialSubmission = r.updatedReason === 'Initial submission'
    const isSubsequentSubmissionOrUnlock =
        r.kind === 'submit' ||
        r.kind === 'unlock' ||
        r.kind === 'submit_with_review'
    const isReviewUpdate =
        r.kind === 'review_update_submitted' ||
        r.kind === 'review_update_withdraw' ||
        r.kind === 'review_update_approve'
    const isUndoApprove = r.kind === 'review_update_undo_approve'
    const isUndoUnlock = r.kind === 'undo_unlock'
    // We want to know if this contract has multiple submissions. To have multiple submissions, there must be minimum
    // more than the initial contract revision.
    const hasSubsequentSubmissions = revisionHistory.length > 1
    const isNotSubjectToReview = r.reviewDecision === 'NOT_SUBJECT_TO_REVIEW'

    let content = <></>
    let title = 'Submission'
    if (isInitialSubmission) {
        content = (
            <div data-testid={`change-history-record`}>
                <span className={styles.tag}>Submitted by:</span>
                <span>{` ${getUpdatedByDisplayName(r.updatedBy)} `}</span>
                {r.kind === 'submit_with_review' && (
                    <>
                        <div>
                            <span className={styles.tag}>Status: </span>
                            <span>
                                {isNotSubjectToReview
                                    ? ReviewDecisionRecord[
                                          'NOT_SUBJECT_TO_REVIEW'
                                      ]
                                    : 'Submitted'}
                            </span>
                        </div>
                        <div>
                            <span className={styles.tag}>
                                Review decision:{' '}
                            </span>
                            <span>
                                {isNotSubjectToReview
                                    ? ReviewDecisionRecord[
                                          'NOT_SUBJECT_TO_REVIEW'
                                      ]
                                    : ReviewDecisionRecord['UNDER_REVIEW']}
                            </span>
                        </div>
                    </>
                )}
                {r.revisionVersion && hasSubsequentSubmissions && (
                    <div className={styles.previousSubmissionLink}>
                        <LinkWithLogging
                            href={getPreviousSubmissionLink({
                                contractSubmissionType,
                                contractID: contract.id,
                                revisionVersion: r.revisionVersion,
                            })}
                            data-testid={`revision-link-${r.revisionVersion}`}
                        >
                            View past submission version
                        </LinkWithLogging>
                    </div>
                )}
            </div>
        )
    } else if (isSubsequentSubmissionOrUnlock) {
        const isSubmit = r.kind === 'submit' || r.kind === 'submit_with_review'

        title = isSubmit ? 'Submission' : 'Unlock'
        content = (
            <div data-testid={`change-history-record`}>
                <div>
                    <span className={styles.tag}>
                        {isSubmit ? 'Submitted by: ' : 'Unlocked by: '}
                    </span>
                    <span>{`${getUpdatedByDisplayName(r.updatedBy)} `}</span>
                </div>
                {r.kind === 'submit_with_review' && (
                    <>
                        <div>
                            <span className={styles.tag}>Status: </span>
                            <span>
                                {isNotSubjectToReview
                                    ? ReviewDecisionRecord[
                                          'NOT_SUBJECT_TO_REVIEW'
                                      ]
                                    : 'Submitted'}
                            </span>
                        </div>
                        <div>
                            <span className={styles.tag}>
                                Review decision:{' '}
                            </span>
                            <span>
                                {isNotSubjectToReview
                                    ? ReviewDecisionRecord[
                                          'NOT_SUBJECT_TO_REVIEW'
                                      ]
                                    : ReviewDecisionRecord['UNDER_REVIEW']}
                            </span>
                        </div>
                    </>
                )}
                <div>
                    <span className={styles.tag}>
                        {isSubmit
                            ? contract.contractSubmissionType === 'EQRO'
                                ? 'Summary of changes: '
                                : 'Changes made: '
                            : 'Reason for unlock: '}
                    </span>
                    <span>{r.updatedReason}</span>
                </div>
                {isSubsequentSubmissionOrUnlock &&
                    (r.kind === 'submit' || r.kind === 'submit_with_review') &&
                    r.revisionVersion && (
                        <div className={styles.previousSubmissionLink}>
                            <LinkWithLogging
                                href={getPreviousSubmissionLink({
                                    contractSubmissionType,
                                    contractID: contract.id,
                                    revisionVersion: r.revisionVersion,
                                })}
                                data-testid={`revision-link-${r.revisionVersion}`}
                            >
                                View past submission version
                            </LinkWithLogging>
                        </div>
                    )}
            </div>
        )
    } else if (isUndoUnlock) {
        title = 'Undo unlock'
        // The submission returns to whatever it was before the unlock, so the
        // status is set by the events that predate the undo unlock.
        const priorReviewAction = contract.reviewStatusActions?.find(
            (action) => new Date(action.updatedAt) < new Date(r.updatedAt)
        )
        const priorSubmissions = contract.packageSubmissions.filter(
            (submission) =>
                submission.cause === 'CONTRACT_SUBMISSION' &&
                new Date(submission.submitInfo.updatedAt) <
                    new Date(r.updatedAt)
        ).length
        let returnedToStatus = SubmissionStatusRecord['SUBMITTED']
        if (priorReviewAction?.actionType === 'NOT_SUBJECT_TO_REVIEW') {
            returnedToStatus = ReviewDecisionRecord['NOT_SUBJECT_TO_REVIEW']
        } else if (priorSubmissions > 1) {
            returnedToStatus = SubmissionStatusRecord['RESUBMITTED']
        }
        content = (
            <div data-testid={`change-history-record`}>
                <div>
                    <span className={styles.tag}>Updated by: </span>
                    <span>{`${getUpdatedByDisplayName(r.updatedBy)} `}</span>
                </div>
                <div>
                    <span className={styles.tag}>Status: </span>
                    <span>{returnedToStatus}</span>
                </div>
                <div>
                    <span className={styles.tag}>
                        Reason for undoing the unlock:{' '}
                    </span>
                    <span>{r.updatedReason}</span>
                </div>
            </div>
        )
    } else if (isUndoApprove) {
        title = 'Submission'
        const baseUndoApproveText = 'CMS undid submission release to state'
        content = (
            <div data-testid={`change-history-record`}>
                <div>
                    <span className={styles.tag}>Submitted by: </span>
                    <span>{`${getUpdatedByDisplayName(r.updatedBy)} `}</span>
                </div>
                <div>
                    <span className={styles.tag}>Changes made: </span>
                    <span>
                        {r.updatedReason
                            ? `${baseUndoApproveText}. ${r.updatedReason}`
                            : baseUndoApproveText}
                    </span>
                </div>
            </div>
        )
    } else if (isReviewUpdate) {
        title = 'Status Update'
        const status = () => {
            if (r.kind === 'review_update_submitted') return 'Submitted'
            if (r.kind === 'review_update_approve') return 'Approved'
            if (r.kind === 'review_update_withdraw') return 'Withdrawn'
            return 'Unknown status'
        }
        content = (
            <div data-testid={`change-history-record`}>
                <div>
                    <span className={styles.tag}>{`Status: `}</span>
                    <span>{status()}</span>
                </div>
                <div>
                    <span className={styles.tag}>Updated by:</span>
                    <span>{` ${getUpdatedByDisplayName(r.updatedBy)} `}</span>
                </div>
                <div>
                    <span className={styles.tag}>Updated on:</span>
                    <span>{` ${formatToPacificTime(r.updatedAt)} `}</span>
                </div>
                {r.updatedReason && (
                    <div>
                        <span className={styles.tag}>{`Optional note: `}</span>
                        <span>{r.updatedReason}</span>
                    </div>
                )}
            </div>
        )
    }
    return { content, title }
}

export const ChangeHistory = ({
    contract,
}: ChangeHistoryProps): React.ReactElement => {
    const { logAccordionEvent } = useTealium()
    const ldClient = useLDClient()
    const chipSubmissionAutomation = ldClient?.variation(
        featureFlags.CHIP_SUBMISSION_AUTOMATION.flag,
        featureFlags.CHIP_SUBMISSION_AUTOMATION.defaultValue
    )
    const flattenedRevisions = (): flatRevisions[] => {
        const result: flatRevisions[] = []
        const contractSubmissions = contract.packageSubmissions.filter(
            (submission) => {
                return submission.cause === 'CONTRACT_SUBMISSION'
            }
        )
        const reviewActions = contract.reviewStatusActions

        //Reverse revisions to order from earliest to latest revision. This is to correctly set version for each
        // contract & recontract.
        let reversedRevisions: (
            | ContractPackageSubmission
            | ContractRevision
            | ContractReviewStatusActions
            | ContractUndoUnlockPackage
            | undefined
            | null
        )[] = [...contractSubmissions, contract.draftRevision]
        if (reviewActions) {
            reversedRevisions = reversedRevisions.concat(...reviewActions)
        }

        if (contract.undoUnlockPackages) {
            reversedRevisions = reversedRevisions.concat(
                ...contract.undoUnlockPackages
            )
        }

        reversedRevisions.reverse()
        let submitsIdx = 1
        reversedRevisions.forEach(
            (r, index) => {
                if (r?.__typename === 'ContractPackageSubmission') {
                    if (r.contractRevision.unlockInfo) {
                        const newUnlock: flatRevisions = {} as flatRevisions
                        newUnlock.updatedAt =
                            r.contractRevision.unlockInfo.updatedAt
                        newUnlock.updatedBy =
                            r.contractRevision.unlockInfo.updatedBy
                        newUnlock.updatedReason =
                            r.contractRevision.unlockInfo.updatedReason
                        newUnlock.kind = 'unlock'
                        result.push(newUnlock)
                    }
                    if (r.submitInfo) {
                        const newSubmit: flatRevisions = {} as flatRevisions
                        const revisionVersion =
                            index !== reversedRevisions.length - 1 // if we aren't at the last item in list, assign a version
                                ? String(submitsIdx)
                                : undefined
                        newSubmit.updatedAt = r.submitInfo.updatedAt
                        newSubmit.updatedBy = r.submitInfo.updatedBy
                        newSubmit.updatedReason = r.submitInfo.updatedReason
                        const isEQRO =
                            contract.contractSubmissionType === 'EQRO'
                        const isHealthPlanCHIPOnly =
                            contract.contractSubmissionType === 'HEALTH_PLAN' &&
                            r.contractRevision.formData.populationCovered ===
                                'CHIP'
                        newSubmit.kind =
                            isEQRO || isHealthPlanCHIPOnly
                                ? 'submit_with_review'
                                : 'submit'
                        if (isEQRO) {
                            const determination =
                                eqroValidationAndReviewDetermination(
                                    contract.id,
                                    r.contractRevision.formData
                                )

                            if (determination === true) {
                                newSubmit.reviewDecision = 'UNDER_REVIEW'
                            } else if (determination === false) {
                                newSubmit.reviewDecision =
                                    'NOT_SUBJECT_TO_REVIEW'
                            }
                        } else if (
                            chipSubmissionAutomation &&
                            isHealthPlanCHIPOnly
                        ) {
                            newSubmit.reviewDecision =
                                healthPlanReviewDetermination(
                                    r.contractRevision.formData
                                )
                                    ? 'UNDER_REVIEW'
                                    : 'NOT_SUBJECT_TO_REVIEW'
                        }

                        newSubmit.revisionVersion = revisionVersion
                        result.push(newSubmit)
                        submitsIdx = submitsIdx + 1
                    }
                }
                if (r?.__typename === 'ContractRevision') {
                    if (r.unlockInfo) {
                        const newUnlock: flatRevisions = {} as flatRevisions
                        newUnlock.updatedAt = r.unlockInfo.updatedAt
                        newUnlock.updatedBy = r.unlockInfo.updatedBy
                        newUnlock.updatedReason = r.unlockInfo.updatedReason
                        newUnlock.kind = 'unlock'
                        result.push(newUnlock)
                    }
                }
                if (r?.__typename === 'ContractReviewStatusActions') {
                    // An "undo approval" is recorded as an UNDER_REVIEW action
                    // that immediately follows a MARK_AS_APPROVED action.
                    // reviewStatusActions is ordered latest-first, so the action
                    // it reversed is the next (older) one in the list.
                    const actionIndex =
                        reviewActions?.findIndex((a) => a === r) ?? -1
                    const priorAction =
                        actionIndex >= 0
                            ? reviewActions?.[actionIndex + 1]
                            : undefined
                    const isUndoApprove =
                        r.actionType === 'UNDER_REVIEW' &&
                        priorAction?.actionType === 'MARK_AS_APPROVED'

                    if (
                        !isUndoApprove &&
                        (r.actionType === 'NOT_SUBJECT_TO_REVIEW' ||
                            r.actionType === 'UNDER_REVIEW')
                    ) {
                        return
                    }
                    let actionKind: flatRevisions['kind'] =
                        'review_update_submitted'

                    if (r.actionType === 'WITHDRAW') {
                        actionKind = 'review_update_withdraw'
                    }

                    if (r.actionType === 'MARK_AS_APPROVED') {
                        actionKind = 'review_update_approve'
                    }

                    if (isUndoApprove) {
                        actionKind = 'review_update_undo_approve'
                    }

                    const newAction: flatRevisions = {} as flatRevisions
                    newAction.updatedAt = r.updatedAt
                    newAction.updatedBy = r.updatedBy ?? undefined
                    if (isUndoApprove) {
                        newAction.updatedReason = r.updatedReason ?? ''
                    }
                    newAction.kind = actionKind
                    result.push(newAction)
                }
                if (r?.__typename === 'ContractUndoUnlockPackage') {
                    // Undoing an unlock hides that unlock's revision from both
                    // packageSubmissions and draftRevision, so the snapshot is
                    // the only remaining record of the unlock itself.
                    const reversedUnlockInfo =
                        r.draftContractRevisionSnapshot.unlockInfo
                    if (reversedUnlockInfo) {
                        const newUnlock: flatRevisions = {} as flatRevisions
                        newUnlock.updatedAt = reversedUnlockInfo.updatedAt
                        newUnlock.updatedBy = reversedUnlockInfo.updatedBy
                        newUnlock.updatedReason =
                            reversedUnlockInfo.updatedReason
                        newUnlock.kind = 'unlock'
                        result.push(newUnlock)
                    }

                    const newUndoUnlock: flatRevisions = {} as flatRevisions
                    newUndoUnlock.updatedAt = r.undoUnlockInfo.updatedAt
                    newUndoUnlock.updatedBy = r.undoUnlockInfo.updatedBy
                    newUndoUnlock.updatedReason = r.undoUnlockInfo.updatedReason
                    newUndoUnlock.kind = 'undo_unlock'
                    result.push(newUndoUnlock)
                }
            },
            (submitsIdx = 1)
        )

        return result.sort(
            (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
        )
    }

    const revisionHistory = flattenedRevisions()
    const revisedItems: AccordionProps['items'] = revisionHistory.map((r) => {
        const { content, title } = buildChangeHistoryInfo(
            r,
            contract.contractSubmissionType,
            revisionHistory,
            contract
        )
        return {
            title: (
                <div>{`${formatToPacificTime(r.updatedAt)} - ${title}`}</div>
            ),
            // Display this code if this is the initial contract. We only want to display the link of the initial contract
            // only if there has been subsequent contracts. We do not want to display a link if the package initial
            // contract was unlocked, but has not been resubmitted yet.
            headingLevel: 'h5',
            content,
            expanded: false,
            handleToggle: () => {
                logAccordionEvent({
                    event_name: 'accordion_opened',
                    heading: getUpdatedByDisplayName(r.updatedBy) ?? 'unknown',
                    link_type: 'link_other',
                })
            },
            id: dayjs(r.updatedAt).toISOString(),
        }
    })
    return (
        <section id="changeHistory" className={styles.summarySection}>
            <SectionHeader
                header="Change history"
                hideBorderBottom
                hideBorderTop
                headingLevel="h2"
            />
            <Accordion items={revisedItems} multiselectable />
        </section>
    )
}
