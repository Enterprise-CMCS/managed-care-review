import { Grid } from '@trussworks/react-uswds'
import dayjs from 'dayjs'
import { HealthPlanFormDataType } from '../../../common-code/domain-models'
import { DataDetail } from '../../../components/DataDetail'
import { DoubleColumnGrid } from '../../../components/DoubleColumnGrid'
import { SectionHeader } from '../../../components/SectionHeader'
import { SubmissionTypeRecord } from '../../../constants/healthPlanPackages'
import { Program } from '../../../gen/gqlClient'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import styles from '../SubmissionSummarySection.module.scss'

export type SubmissionTypeSummarySectionProps = {
    submission: HealthPlanFormDataType
    statePrograms: Program[]
    navigateTo?: string
    headerChildComponent?: React.ReactElement
    initiallySubmittedAt?: Date
    submissionName: string
}

export const SubmissionTypeSummarySection = ({
    submission,
    statePrograms,
    navigateTo,
    headerChildComponent,
    initiallySubmittedAt,
    submissionName,
}: SubmissionTypeSummarySectionProps): React.ReactElement => {
    const isPreviousSubmission = usePreviousSubmission()
    const programNames = statePrograms
        .filter((p) => submission.programIDs.includes(p.id))
        .map((p) => p.name)
    const isSubmitted = submission.status === 'SUBMITTED'

    return (
        <section id="submissionTypeSection" className={styles.summarySection}>
            <SectionHeader
                header={submissionName}
                navigateTo={navigateTo}
                headerId={'submissionName'}
            >
                {headerChildComponent && headerChildComponent}
            </SectionHeader>

            <dl>
                {isSubmitted && !isPreviousSubmission && (
                    <DoubleColumnGrid>
                        <DataDetail
                            id="submitted"
                            label="Submitted"
                            data={
                                <span>
                                    {dayjs(initiallySubmittedAt).format(
                                        'MM/DD/YY'
                                    )}
                                </span>
                            }
                        />
                        <></>
                    </DoubleColumnGrid>
                )}
                <DoubleColumnGrid>
                    <DataDetail
                        id="program"
                        label="Program(s)"
                        data={programNames}
                    />
                    <DataDetail
                        id="submissionType"
                        label="Submission type"
                        data={SubmissionTypeRecord[submission.submissionType]}
                    />
                </DoubleColumnGrid>
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
