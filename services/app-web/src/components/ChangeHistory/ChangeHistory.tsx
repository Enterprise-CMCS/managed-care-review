import React from 'react'
import { dayjs } from '../../common-code/dateHelpers/dayjs'
import { SectionHeader } from '../SectionHeader'
import { Accordion, Link } from '@trussworks/react-uswds'
import { HealthPlanPackage, UpdateInformation } from '../../gen/gqlClient'
import styles from './ChangeHistory.module.scss'
type ChangeHistoryProps = {
    submission: HealthPlanPackage
}

type flatRevisions = UpdateInformation & {
    kind: 'submit' | 'unlock'
    previousRevisionVersion: string | undefined
}

export const ChangeHistory = ({
    submission,
}: ChangeHistoryProps): React.ReactElement => {
    const flattenedRevisions = (): flatRevisions[] => {
        const result: flatRevisions[] = []
        //Reverse revisions to order from earliest to latest revision. This is to correctly set version for each
        // submission & resubmission.
        const reversedRevisions = [...submission.revisions].reverse()
        reversedRevisions.forEach((r, index) => {
            if (r.node.unlockInfo) {
                const newUnlock: flatRevisions = {} as flatRevisions
                newUnlock.updatedAt = r.node.unlockInfo.updatedAt
                newUnlock.updatedBy = r.node.unlockInfo.updatedBy
                newUnlock.updatedReason = r.node.unlockInfo.updatedReason
                newUnlock.kind = 'unlock'
                //Use unshift to push the latest revision unlock info to the beginning of the array
                result.unshift(newUnlock)
            }
            if (r.node.submitInfo) {
                const newSubmit: flatRevisions = {} as flatRevisions

                // This is used to link to the previous revision if it exists.
                // If no previous revision exists and this is the initial revision, set to undefined
                const previousRevisionVersion =
                    index === 0 ? undefined : String(index) //Offset version, we want to start at 1
                console.log(r)
                console.log(previousRevisionVersion)
                newSubmit.updatedAt = r.node.submitInfo.updatedAt
                newSubmit.updatedBy = r.node.submitInfo.updatedBy
                newSubmit.updatedReason = r.node.submitInfo.updatedReason
                newSubmit.kind = 'submit'
                newSubmit.previousRevisionVersion = previousRevisionVersion
                //Use unshift to push the latest revision submit info to the beginning of the array
                result.unshift(newSubmit)
            }
        })
        return result
    }
    const flattened = flattenedRevisions()

    const revisedItems = flattened.map((r) => {
        const isInitialSubmission = r.updatedReason === 'Initial submission'
        const isSubsequentSubmission = r.kind === 'submit'
        console.log(isInitialSubmission)
        console.log(isSubsequentSubmission)
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
            content: isInitialSubmission ? (
                <>
                    <span className={styles.tag}>Submitted by:</span>
                    <span> {r.updatedBy}</span>
                </>
            ) : (
                <>
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
                    {isSubsequentSubmission && r.previousRevisionVersion && (
                        <Link
                            href={`/submissions/${submission.id}/revisions/${r.previousRevisionVersion}`}
                            data-testid={`revision-link-${r.previousRevisionVersion}`}
                        >
                            View past submission version
                        </Link>
                    )}
                </>
            ),
            expanded: false,
            id: r.updatedAt.toString(),
        }
    })
    return (
        <section id="changeHistory" className={styles.summarySection}>
            <SectionHeader header="Change history" hideBorder />
            <Accordion items={revisedItems} multiselectable />
        </section>
    )
}
