import React from 'react'
import { dayjs } from '@mc-review/dates'
import { SectionHeader } from '../SectionHeader'
import { Accordion } from '@trussworks/react-uswds'
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion'
import {
    UpdateInformation,
    Contract,
    UnlockedContract,
    ContractReviewStatusActions,
    ContractPackageSubmission,
    ContractRevision,
    ContractSubmissionType,
} from '../../gen/gqlClient'
import styles from './ChangeHistory.module.scss'
import { LinkWithLogging } from '../TealiumLogging'
import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { useTealium } from '../../hooks'
import { formatToPacificTime } from '@mc-review/dates'
import { ContractSubmissionTypeRecord } from '@mc-review/constants'

type ChangeHistoryProps = {
    contract: Contract | UnlockedContract
}

type flatRevisions = Omit<UpdateInformation, 'updatedBy'> & {
    kind:
        | 'submit'
        | 'unlock'
        | 'review_update_approve'
        | 'review_update_withdraw'
        | 'review_update_submitted'
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

const getReviewDecisionForDate = (
    date: string,
    reviewActions?: ContractReviewStatusActions[]
) => {
    if (!reviewActions?.length) return undefined

    const target = new Date(date).getTime()
    const WINDOW_MS = 5000 // 5 seconds

    const sorted = [...reviewActions].sort(
        (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    )

    const match = sorted.find((action) => {
        const time = new Date(action.updatedAt).getTime()
        return time >= target && time <= target + WINDOW_MS
    })

    if (match) return match.actionType

    // fallback: latest status before submission
    const before = [...sorted]
        .reverse()
        .find((action) => new Date(action.updatedAt).getTime() <= target)

    return before?.actionType
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
                                    ? 'Not subject to review'
                                    : 'Submitted'}
                            </span>
                        </div>
                        <div>
                            <span className={styles.tag}>
                                Review Decision:{' '}
                            </span>
                            <span>
                                {isNotSubjectToReview
                                    ? 'Not subject to review'
                                    : 'Subject to review'}
                            </span>
                        </div>
                    </>
                )}
                <br />
                {r.revisionVersion && hasSubsequentSubmissions && (
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
                                    ? 'Not subject to review'
                                    : 'Submitted'}
                            </span>
                        </div>
                        <div>
                            <span className={styles.tag}>
                                Review Decision:{' '}
                            </span>
                            <span>
                                {isNotSubjectToReview
                                    ? 'Not subject to review'
                                    : 'Subject to review'}
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
                    )}
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
            | undefined
            | null
        )[] = [...contractSubmissions, contract.draftRevision]
        if (reviewActions) {
            reversedRevisions = reversedRevisions.concat(...reviewActions)
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
                        newSubmit.kind =
                            contract.contractSubmissionType === 'EQRO'
                                ? 'submit_with_review'
                                : 'submit'
                        const reviewDecision = getReviewDecisionForDate(
                            r.submitInfo.updatedAt,
                            reviewActions ?? []
                        )
                        newSubmit.reviewDecision = reviewDecision
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
                    if (contract.contractSubmissionType === 'EQRO') {
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

                    const newAction: flatRevisions = {} as flatRevisions
                    newAction.updatedAt = r.updatedAt
                    newAction.updatedBy = r.updatedBy ?? undefined
                    newAction.kind = actionKind
                    result.push(newAction)
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
    const revisedItems: AccordionItemProps[] = revisionHistory.map((r) => {
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
            headingLevel: 'h4',
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
            />
            <Accordion items={revisedItems} multiselectable />
        </section>
    )
}
