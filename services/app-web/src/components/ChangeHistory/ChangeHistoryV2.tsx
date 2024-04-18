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
        //Reverse revisions to order from earliest to latest revision. This is to correctly set version for each
        // contract & recontract.
        const reversedRevisions = [...contract.packageSubmissions].reverse()
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
            if (r.contractRevision.submitInfo) {
                const newSubmit: flatRevisions = {} as flatRevisions

                // Only set revisionVersion if not the latest revision and if not unlocked. This is not the same
                // as the order of change history. The version correlates with each submitted revision.
                const revisionVersion =
                    index !== reversedRevisions.length - 1
                        ? String(index + 1) //Offset version, we want to start at 1
                        : undefined

                newSubmit.updatedAt = r.contractRevision.submitInfo.updatedAt
                newSubmit.updatedBy = r.contractRevision.submitInfo.updatedBy
                newSubmit.updatedReason =
                    r.contractRevision.submitInfo.updatedReason
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
            const isInitialSubmission = r.updatedReason === 'Initial contract'
            const isSubsequentSubmission = r.kind === 'submit'
            // We want to know if this package has multiple contracts. To have multiple contracts, there must be minimum
            // 3 revisions in revisionHistory the initial contract revision, unlock revision and recontract revision.
            const hasSubsequentSubmissions = revisionHistory.length >= 3
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
                        <span> {r.updatedBy}</span>
                        <br />
                        {r.revisionVersion && hasSubsequentSubmissions && (
                            <Link
                                href={`/contracts/${contract.id}/revisions/${r.revisionVersion}`}
                                data-testid={`revision-link-${r.revisionVersion}`}
                            >
                                View past contract version
                            </Link>
                        )}
                    </div>
                ) : (
                    <div data-testid={`change-history-record`}>
                        <div>
                            <span className={styles.tag}>
                                {isSubsequentSubmission
                                    ? 'Submitted by: '
                                    : 'Unlocked by: '}{' '}
                            </span>
                            <span>{r.updatedBy}</span>
                        </div>
                        <div>
                            <span className={styles.tag}>
                                {isSubsequentSubmission
                                    ? 'Changes made: '
                                    : 'Reason for unlock: '}
                            </span>
                            <span>{r.updatedReason}</span>
                        </div>
                        {isSubsequentSubmission && r.revisionVersion && (
                            <Link
                                href={`/contracts/${contract.id}/revisions/${r.revisionVersion}`}
                                data-testid={`revision-link-${r.revisionVersion}`}
                            >
                                View past contract version
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
