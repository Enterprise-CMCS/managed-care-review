import { Grid } from '@trussworks/react-uswds'
import dayjs from 'dayjs'
import styles from '../SubmissionSummary.module.scss'
import { SubmissionTypeRecord } from '../../../constants/submissions'
import { DataDetail } from '../../DataDetail/DataDetail'
import { DoubleColumnRow } from '../../DoubleColumnRow/DoubleColumnRow'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'
import { isStateSubmission } from '../../../gqlHelpers'

export type SubmissionTypeSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
}

export const SubmissionTypeSummarySection = ({
    submission,
}: SubmissionTypeSummarySectionProps): React.ReactElement => {
    return (
        <section id="submissionType" className={styles.reviewSection}>
            <h2>{submission.name}</h2>
            {isStateSubmission(submission) && (
                <span>
                    Submitted:{' '}
                    {dayjs(submission.submittedAt).format('MM/DD/YY')}
                </span>
            )}

            <dl>
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
