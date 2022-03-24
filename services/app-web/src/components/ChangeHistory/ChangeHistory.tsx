import React from 'react'
import { SectionHeader } from '../SectionHeader'
import { Accordion } from '@trussworks/react-uswds'
import { Submission2 } from '../../gen/gqlClient'
import { UpdateInfoType } from '../../common-code/domain-models'
import styles from './ChangeHistory.module.scss'
export type ChangeHistoryProps = {
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
                <span>
                    {r.updatedAt} -{' '}
                    {isSubsequentSubmission ? 'Submission' : 'Unlock'}
                </span>
            ),
            content: isInitialSubmission ? (
                <React.Fragment>
                    <div>Submitted by: {r.updatedBy}</div>
                </React.Fragment>
            ) : (
                <React.Fragment>
                    <div>
                        {isSubsequentSubmission
                            ? 'Submitted by: '
                            : 'Unlocked by: '}{' '}
                        {r.updatedBy}
                    </div>
                    <div>
                        {isSubsequentSubmission
                            ? 'Changes made: '
                            : 'Reason for unlock: '}
                        {r.updatedReason}
                    </div>
                </React.Fragment>
            ),
            expanded: false,
            id: r.updatedAt.toString(),
        }
    })
    return (
        <section id="changeHistory" className={styles.summarySection}>
            <SectionHeader header="Change history" />
            <Accordion items={revisedItems} />
        </section>
    )
}
