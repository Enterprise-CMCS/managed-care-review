import { Grid } from '@trussworks/react-uswds'
import styles from '../SubmissionSummaryCard.module.scss'
import {
    SubmissionSummaryCardProps,
    CardHeader,
} from '../SubmissionSummaryCard'
import { SubmissionTypeRecord } from '../../../constants/submissions'
import { DataDetail } from '../../DataDetail/DataDetail'
import { DoubleColumnRow } from '../../DoubleColumnRow/DoubleColumnRow'

export const SubmissionTypeSummaryCard = ({
    submission,
    editable,
    to,
}: SubmissionSummaryCardProps): React.ReactElement => {
    return (
        <section id="submissionType" className={styles.reviewSection}>
            <CardHeader header={submission.name} editable={editable} to={to} />

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
