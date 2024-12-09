import React from 'react'
import { dayjs } from '../../common-code/dateHelpers/dayjs'
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
} from '../../gen/gqlClient'
import styles from './ChangeHistory.module.scss'
import { LinkWithLogging } from '../TealiumLogging/Link'
import { getUpdatedByDisplayName } from '../../gqlHelpers/userHelpers'
import { useTealium } from '../../hooks'
import { formatToPacificTime } from '../../common-code/dateHelpers'

type ChangeHistoryProps = {
    contract: Contract | UnlockedContract
}

type flatRevisions = UpdateInformation & {
    kind: 'submit' | 'unlock' | 'approve' | 'withdraw'
    revisionVersion: string | undefined
}

const buildChangeHistoryInfo = (
    r: flatRevisions,
    revisionHistory: flatRevisions[],
    contract: Contract | UnlockedContract
): { content: JSX.Element; title: string } => {
    const isInitialSubmission = r.updatedReason === 'Initial submission'
    const isSubsequentSubmissionOrUnlock =
        r.kind === 'submit' || r.kind === 'unlock'
    const isApprovalAction = r.kind === 'approve'
    // We want to know if this contract has multiple submissions. To have multiple submissions, there must be minimum
    // more than the initial contract revision.
    const hasSubsequentSubmissions = revisionHistory.length > 1

    let content = <></>
    let title = 'Submission'
    if (isInitialSubmission) {
        content = (
            <div data-testid={`change-history-record`}>
                <span className={styles.tag}>Submitted by:</span>
                <span>{` ${getUpdatedByDisplayName(r.updatedBy)} `}</span>
                <br />
                {r.revisionVersion && hasSubsequentSubmissions && (
                    <LinkWithLogging
                        href={`/submissions/${contract.id}/revisions/${r.revisionVersion}`}
                        data-testid={`revision-link-${r.revisionVersion}`}
                    >
                        View past submission version
                    </LinkWithLogging>
                )}
            </div>
        )
    } else if (isSubsequentSubmissionOrUnlock) {
        const isSubmit = r.kind === 'submit'
        title = isSubmit ? 'Submission' : 'Unlock'
        content = (
            <div data-testid={`change-history-record`}>
                <div>
                    <span className={styles.tag}>
                        {isSubmit ? 'Submitted by: ' : 'Unlocked by: '}
                    </span>
                    <span>{`${getUpdatedByDisplayName(r.updatedBy)} `}</span>
                </div>
                <div>
                    <span className={styles.tag}>
                        {isSubmit ? 'Changes made: ' : 'Reason for unlock: '}
                    </span>
                    <span>{r.updatedReason}</span>
                </div>
                {isSubsequentSubmissionOrUnlock &&
                    r.kind === 'submit' &&
                    r.revisionVersion && (
                        <LinkWithLogging
                            href={`/submissions/${contract.id}/revisions/${r.revisionVersion}`}
                            data-testid={`revision-link-${r.revisionVersion}`}
                        >
                            View past submission version
                        </LinkWithLogging>
                    )}
            </div>
        )
    } else if (isApprovalAction) {
        title = 'Status Update'
        content = (
            <div data-testid={`change-history-record`}>
                <div>
                    <span className={styles.tag}>{`Status: `}</span>
                    <span>Approved</span>
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
                        newSubmit.kind = 'submit'
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
                    let actionKind: flatRevisions['kind'] = 'approve'
                    switch (r.actionType) {
                        case 'WITHDRAW':
                            actionKind = 'withdraw'
                            break
                    }
                    const newAction: flatRevisions = {} as flatRevisions
                    newAction.updatedAt = r.updatedAt
                    newAction.updatedBy = r.updatedBy
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
            <SectionHeader header="Change history" hideBorder />
            <Accordion items={revisedItems} multiselectable />
        </section>
    )
}
