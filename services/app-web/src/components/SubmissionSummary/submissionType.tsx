import { Grid, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import styles from '../../pages/StateSubmissionForm/ReviewSubmit/ReviewSubmit.module.scss'
import { SubmissionSectionSummaryProps } from './submissionSummary'
import { SubmissionTypeRecord } from '../../constants/submissions'
import { DataDetail } from '../DataDetail/DataDetail'
import { DoubleColumnRow } from '../DoubleColumnRow/DoubleColumnRow'

export const SubmissionTypeSummary = ({
    submission,
}: SubmissionSectionSummaryProps): React.ReactElement | null => {
    return (
        <section id="submissionType" className={styles.reviewSection}>
            <div className={styles.reviewSectionHeader}>
                <h2 className={styles.submissionName}>{submission.name}</h2>
                <div>
                    <Link
                        asCustom={NavLink}
                        to="type"
                        className="usa-button usa-button--outline"
                        variant="unstyled"
                    >
                        Edit
                        <span className="srOnly">Submission type</span>
                    </Link>
                </div>
            </div>
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
