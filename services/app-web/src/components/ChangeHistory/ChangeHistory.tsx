import React from 'react'
import { dayjs } from '../../dateHelpers/dayjs'
import { SectionHeader } from '../SectionHeader'
import { Accordion } from '@trussworks/react-uswds'
import { Submission2 } from '../../gen/gqlClient'
import { UpdateInfoType } from '../../common-code/domain-models'
import styles from './ChangeHistory.module.scss'
type ChangeHistoryProps = {
    submission: Submission2
}

type flatRevisions = UpdateInfoType & {
    kind: 'submit' | 'unlock'
}

export const ChangeHistory = ({
    submission,
}: ChangeHistoryProps): React.ReactElement => {
    const flattenedRevisions = (): flatRevisions[] => {
        const result: flatRevisions[] = []
        submission.revisions.forEach((r) => {
            if (r.revision.submitInfo) {
                const newSubmit: flatRevisions = {} as flatRevisions
                newSubmit.updatedAt = r.revision.submitInfo.updatedAt
                newSubmit.updatedBy = r.revision.submitInfo.updatedBy
                newSubmit.updatedReason = r.revision.submitInfo.updatedReason
                newSubmit.kind = 'submit'
                result.push(newSubmit)
            }
            if (r.revision.unlockInfo) {
                const newUnlock: flatRevisions = {} as flatRevisions
                newUnlock.updatedAt = r.revision.unlockInfo.updatedAt
                newUnlock.updatedBy = r.revision.unlockInfo.updatedBy
                newUnlock.updatedReason = r.revision.unlockInfo.updatedReason
                newUnlock.kind = 'unlock'
                result.push(newUnlock)
            }
        })
        return result
    }
    const revisedItems = flattenedRevisions().map((r) => {
        const isInitialSubmission = r.updatedReason === 'Initial submission'
        const isSubsequentSubmission = r.kind === 'submit'
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
                </>
            ),
            expanded: false,
            id: r.updatedAt.toString(),
        }
    })
    return (
        <section id="changeHistory" className={styles.summarySection}>
            <SectionHeader header="Change history" hideBorder />
            <Accordion items={revisedItems} />
        </section>
    )
}
