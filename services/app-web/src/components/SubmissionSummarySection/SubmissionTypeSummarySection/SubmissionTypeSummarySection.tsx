import { Grid } from '@trussworks/react-uswds'
import dayjs from 'dayjs'
import { HealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { DataDetail } from '../../../components/DataDetail'
import { DoubleColumnGrid } from '../../../components/DoubleColumnGrid'
import { SectionHeader } from '../../../components/SectionHeader'
import { SubmissionTypeRecord } from '../../../constants/healthPlanPackages'
import { Program } from '../../../gen/gqlClient'
import { usePreviousSubmission } from '../../../hooks/usePreviousSubmission'
import { booleanAsYesNoUserValue } from '../../../components/Form/FieldYesNo/FieldYesNo'
import styles from '../SubmissionSummarySection.module.scss'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'

export type SubmissionTypeSummarySectionProps = {
    submission: HealthPlanFormDataType
    statePrograms: Program[]
    navigateTo?: string
    headerChildComponent?: React.ReactElement
    initiallySubmittedAt?: Date
    submissionName: string
}

/*
   Determine UX for package data on summary pages, accounting for possible missing fields.
   
   On the submission summary and review and submit pages, there are a variety of states a package could be in depending when it was initially drafted
   - on the submission summary page,  hide empty missing fields from view; users only see data that was present when package was submitted
   - on the review and submit page, we display empty missing fields to user so they know to edit and change their unlocked package
*/
function handlePossibleMissingRequiredField<T>({
    isSubmitted,
    fieldValue,
}: {
    isSubmitted: boolean // only true on submission summary page
    fieldValue: T | undefined
}): T | React.ReactNode {
    console.log(fieldValue)
    const requiredFieldMissingText =
        'Missing Field - this field is required. Please edit this section to include a response.'

    if (isSubmitted && fieldValue === undefined) {
        // hide from view entirely
        return null
    } else if (!isSubmitted && fieldValue === undefined) {
        // display missing required field error text
        return (
            <span className={styles.missingField}>
                {requiredFieldMissingText}
            </span>
        )
    } else {
        // display field value
        return fieldValue
    }
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

    // Launch Darkly
    const ldClient = useLDClient()
    const showRateCertAssurance = ldClient?.variation(
        featureFlags.RATE_CERT_ASSURANCE.flag,
        featureFlags.RATE_CERT_ASSURANCE.defaultValue
    )

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
                {showRateCertAssurance && (
                    <DoubleColumnGrid>
                        <DataDetail
                            id="riskBasedContract"
                            label="Is this a risk based contract?"
                            data={handlePossibleMissingRequiredField({
                                isSubmitted,
                                fieldValue: booleanAsYesNoUserValue(
                                    submission.riskBasedContract
                                ),
                            })}
                        />
                    </DoubleColumnGrid>
                )}
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
