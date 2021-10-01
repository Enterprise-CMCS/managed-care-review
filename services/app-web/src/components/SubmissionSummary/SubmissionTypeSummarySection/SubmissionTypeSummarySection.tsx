import { Grid } from '@trussworks/react-uswds'
import dayjs from 'dayjs'
import styles from '../SubmissionSummary.module.scss'
import { SectionHeader } from '../../SectionHeader/SectionHeader'
import { SubmissionTypeRecord } from '../../../constants/submissions'
import { DataDetail } from '../../DataDetail'
import { DoubleColumnRow } from '../../DoubleColumnRow'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'
import { isStateSubmission } from '../../../gqlHelpers'

export type SubmissionTypeSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

export const SubmissionTypeSummarySection = ({
    submission,
    navigateTo,
}: SubmissionTypeSummarySectionProps): React.ReactElement => {
    return (
        <section id="submissionType" className={styles.reviewSection}>
            <SectionHeader header={submission.name} navigateTo={navigateTo} />

            <dl>
                {isStateSubmission(submission) && (
                    <DoubleColumnRow
                        left={
                            <DataDetail
                                id="submitted"
                                label="Submitted"
                                data={
                                    <span>
                                        {dayjs(submission.submittedAt).format(
                                            'MM/DD/YY'
                                        )}
                                    </span>
                                }
                            />
                        }
                        right={
                            <DataDetail
                                id="lastUpdated"
                                label="Last updated"
                                data={
                                    <span>
                                        {dayjs(submission.updatedAt).format(
                                            'MM/DD/YY'
                                        )}
                                    </span>
                                }
                            />
                        }
                    />
                )}
                <DoubleColumnRow
                    left={
                        <DataDetail
                            id="program"
                            label="Program"
                            data={submission.program.name}
                        />
                    }
                    right={
                        <DataDetail
                            id="submissionType"
                            label="Submission type"
                            data={
                                SubmissionTypeRecord[submission.submissionType]
                            }
                        />
                    }
                />
                <Grid row gap className={styles.reviewDataRow}>
                    <Grid col={12}>
                        <DataDetail
                            id="submissionDescription"
                            label="Submission description"
                            data={submission.submissionDescription}
                        />
                    </Grid>
                </Grid>
            </dl>
        </section>
    )
}
