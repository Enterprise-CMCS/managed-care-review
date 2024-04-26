import React from 'react'
import { dayjs } from '../../common-code/dateHelpers/dayjs'
import { SectionHeader } from '../SectionHeader'
import { Accordion, Link } from '@trussworks/react-uswds'
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion'
import { UpdateInformation, Contract } from '../../gen/gqlClient'
import styles from './ChangeHistory.module.scss'
type ChangeHistoryProps = {
    contract: Contract
}

type flatRevisions = UpdateInformation & {
    kind: 'submit' | 'unlock'
    revisionVersion: string | undefined
}

export const ChangeHistoryV2 = ({
    contract,
}: ChangeHistoryProps): React.ReactElement => {
    const flattenedRevisions = (): flatRevisions[] => {
        const result: flatRevisions[] = []

        const contractSubmissions = contract.packageSubmissions.filter(
            (submission) => {
                return submission.cause === 'CONTRACT_SUBMISSION'
            }
        )

        //Reverse revisions to order from earliest to latest revision. This is to correctly set version for each
        // contract & recontract.
        const reversedRevisions = [...contractSubmissions].reverse()
        reversedRevisions.forEach((r, index) => {
            if (r.contractRevision.unlockInfo) {
                const newUnlock: flatRevisions = {} as flatRevisions
                newUnlock.updatedAt = r.contractRevision.unlockInfo.updatedAt
                newUnlock.updatedBy = r.contractRevision.unlockInfo.updatedBy
                newUnlock.updatedReason =
                    r.contractRevision.unlockInfo.updatedReason
                newUnlock.kind = 'unlock'
                //Use unshift to push the latest revision unlock info to the beginning of the array
                result.unshift(newUnlock)
            }
            if (r.submitInfo) {
                const newSubmit: flatRevisions = {} as flatRevisions
                const revisionVersion =
                    index !== contract.packageSubmissions.length - 1 // if we aren't at the last item in list, assign a version
                        ? String(index + 1) //Offset version, we want to start at 1
                        : undefined

                newSubmit.updatedAt = r.submitInfo.updatedAt
                newSubmit.updatedBy = r.submitInfo.updatedBy
                newSubmit.updatedReason = r.submitInfo.updatedReason
                newSubmit.kind = 'submit'
                newSubmit.revisionVersion = revisionVersion
                //Use unshift to push the latest revision submit info to the beginning of the array
                result.unshift(newSubmit)
            }
        })
        return result
    }

    const revisionHistory = flattenedRevisions()

    const revisedItems: AccordionItemProps[] = revisionHistory.map(
        (r, index) => {
            const isInitialSubmission = r.updatedReason === 'Initial submission'
            const isSubsequentSubmission = r.kind === 'submit'
            // We want to know if this contract has multiple submissions. To have multiple submissions, there must be minimum
            // more than the initial contract revision.
            const hasSubsequentSubmissions = revisionHistory.length > 1
            return {
                title: (
                    <div>
                        {dayjs
                            .utc(r.updatedAt)
                            .tz('America/New_York')
                            .format('MM/DD/YY h:mma')}{' '}
                        ET - {isSubsequentSubmission ? 'Submission' : 'Unlock'}
                    </div>
                ),
                // Display this code if this is the initial contract. We only want to display the link of the initial contract
                // only if there has been subsequent contracts. We do not want to display a link if the package initial
                // contract was unlocked, but has not been resubmitted yet.
                headingLevel: 'h4',
                content: isInitialSubmission ? (
                    <div data-testid={`change-history-record`}>
                        <span className={styles.tag}>Submitted by:</span>
                        <span> {r.updatedBy}&nbsp;</span>
                        <br />
                        {r.revisionVersion && hasSubsequentSubmissions && (
                            <Link
                                href={`/submissions/${contract.id}/revisions/${r.revisionVersion}`}
                                data-testid={`revision-link-${r.revisionVersion}`}
                            >
                                View past submission version
                            </Link>
                        )}
                    </div>
                ) : (
                    <div data-testid={`change-history-record`}>
                        <div>
                            <span className={styles.tag}>
                                {isSubsequentSubmission
                                    ? 'Submitted by:'
                                    : 'Unlocked by:'}
                                    &nbsp;
                            </span>
                            <span>{r.updatedBy}&nbsp;</span>
                        </div>
                        <div>
                            <span className={styles.tag}>
                                {isSubsequentSubmission
                                    ? 'Changes made:'
                                    : 'Reason for unlock:'}
                                     &nbsp;
                            </span>
                            <span>{r.updatedReason}</span>
                        </div>
                        {isSubsequentSubmission && r.revisionVersion && (
                            <Link
                                href={`/submissions/${contract.id}/revisions/${r.revisionVersion}`}
                                data-testid={`revision-link-${r.revisionVersion}`}
                            >
                                View past submission version
                            </Link>
                        )}
                    </div>
                ),
                expanded: false,
                id: r.updatedAt.toString(),
            }
        }
    )
    return (
        <section id="changeHistory" className={styles.summarySection}>
            <SectionHeader header="Change history" hideBorder />
            <Accordion items={revisedItems} multiselectable />
        </section>
    )
}
