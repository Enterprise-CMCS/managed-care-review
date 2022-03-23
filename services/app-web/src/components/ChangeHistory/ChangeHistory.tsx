import { SectionHeader } from '../SectionHeader'
import { Table } from '@trussworks/react-uswds'
import { Submission2 } from '../../gen/gqlClient'
import styles from '../SubmissionSummarySection/SubmissionSummarySection.module.scss'
export type ChangeHistoryProps = {
    submission: Submission2
}

export const ChangeHistory = ({
    submission,
}: ChangeHistoryProps): React.ReactElement => {
    return (
        <section id="changeHistory" className={styles.summarySection}>
            <SectionHeader header="Change history" />
            <Table>
                <tbody>
                    <tr>
                        <td>row to expand</td>
                        <td>
                            {submission.revisions.map((r) => {
                                return (
                                    <div key={r.revision.id}>
                                        <div>
                                            {r.revision.submitInfo?.updatedBy}
                                        </div>
                                        <div>
                                            {r.revision.submitInfo?.updatedAt}
                                        </div>
                                        <div>
                                            {
                                                r.revision.submitInfo
                                                    ?.updatedReason
                                            }
                                        </div>
                                    </div>
                                )
                            })}
                        </td>
                    </tr>
                </tbody>
            </Table>
        </section>
    )
}
