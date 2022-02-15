import { Grid } from '@trussworks/react-uswds'
import dayjs from 'dayjs'
import { DataDetail } from '../../../components/DataDetail'
import { DoubleColumnRow } from '../../../components/DoubleColumnRow'
import { SectionHeader } from '../../../components/SectionHeader'
import { SubmissionTypeRecord } from '../../../constants/submissions'
import { DraftSubmission, StateSubmission } from '../../../gen/gqlClient'
import { isStateSubmission } from '../../../gqlHelpers'
import styles from '../SubmissionSummarySection.module.scss'

export type SubmissionTypeSummarySectionProps = {
    submission: DraftSubmission | StateSubmission
    navigateTo?: string
    unlockModalButton?: React.ReactElement
}

export const SubmissionTypeSummarySection = ({
    submission,
    navigateTo,
    unlockModalButton,
}: SubmissionTypeSummarySectionProps): React.ReactElement => {

    return (
        <section id="submissionTypeSection" className={styles.summarySection}>
            <SectionHeader header={submission.name} navigateTo={navigateTo} >
                {unlockModalButton && unlockModalButton}
            </SectionHeader>

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
                            label="Program(s)"
                            data={submission.programIDs}
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
