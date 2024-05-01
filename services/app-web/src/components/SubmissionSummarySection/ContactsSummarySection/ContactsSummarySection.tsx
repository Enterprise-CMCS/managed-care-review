import { Grid, GridContainer } from '@trussworks/react-uswds'
import styles from '../SubmissionSummarySection.module.scss'
import { SectionHeader } from '../../SectionHeader'
import { HealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { DataDetail, DataDetailContactField } from '../../DataDetail'
import { SectionCard } from '../../SectionCard'

export type ContactsSummarySectionProps = {
    submission: HealthPlanFormDataType
    editNavigateTo?: string
}

export const ContactsSummarySection = ({
    submission,
    editNavigateTo,
}: ContactsSummarySectionProps): React.ReactElement => {
    const isSubmitted = submission.status === 'SUBMITTED'

    return (
        <SectionCard id="stateContacts" className={styles.summarySection}>
            <SectionHeader
                header="State contacts"
                editNavigateTo={editNavigateTo}
            />

            <GridContainer className="padding-left-0">
                <Grid row>
                    <dl>
                        {submission.stateContacts.length > 0 ? (
                            submission.stateContacts.map(
                                (stateContact, index) => (
                                    <DataDetail
                                        key={'statecontact_' + index}
                                        id={'statecontact_' + index}
                                        label={`Contact ${index + 1}`}
                                        children={
                                            <DataDetailContactField
                                                contact={stateContact}
                                            />
                                        }
                                    />
                                )
                            )
                        ) : (
                            <DataDetail
                                id="statecontact"
                                label="Contact"
                                explainMissingData={!isSubmitted}
                                children={undefined}
                            />
                        )}
                    </dl>
                </Grid>
            </GridContainer>
        </SectionCard>
    )
}
