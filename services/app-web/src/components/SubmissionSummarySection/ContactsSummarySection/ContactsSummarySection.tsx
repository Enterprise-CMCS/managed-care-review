import { Grid, GridContainer } from '@trussworks/react-uswds'
import styles from '../SubmissionSummarySection.module.scss'
import { SectionHeader } from '../../SectionHeader'
import {
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
} from '../../../constants/healthPlanPackages'
import { HealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { ActuaryContact } from '../../../common-code/healthPlanFormDataType'
import { DataDetail, DataDetailContactField } from '../../DataDetail'

export type ContactsSummarySectionProps = {
    submission: HealthPlanFormDataType
    editNavigateTo?: string
}

export const getActuaryFirm = (actuaryContact: ActuaryContact): string => {
    if (
        actuaryContact.actuarialFirmOther &&
        actuaryContact.actuarialFirm === 'OTHER'
    ) {
        return actuaryContact.actuarialFirmOther
    } else if (
        actuaryContact.actuarialFirm &&
        ActuaryFirmsRecord[actuaryContact.actuarialFirm]
    ) {
        return ActuaryFirmsRecord[actuaryContact.actuarialFirm]
    } else {
        return ''
    }
}

export const ContactsSummarySection = ({
    submission,
    editNavigateTo,
}: ContactsSummarySectionProps): React.ReactElement => {
    const isSubmitted = submission.status === 'SUBMITTED'

    return (
        <section id="stateContacts" className={styles.summarySection}>
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

            {submission.submissionType === 'CONTRACT_AND_RATES' && (
                <>
                    {submission.addtlActuaryContacts.length > 0 && (
                        <dl>
                            <SectionHeader header="Additional actuary contacts" />
                            <GridContainer>
                                <Grid row>
                                    {submission.addtlActuaryContacts.map(
                                        (actuaryContact, index) => (
                                            <Grid
                                                col={6}
                                                key={'actuarycontact_' + index}
                                            >
                                                <DataDetail
                                                    id={
                                                        'actuarycontact_' +
                                                        index
                                                    }
                                                    label="Additional actuary contact"
                                                    children={
                                                        <DataDetailContactField
                                                            contact={
                                                                actuaryContact
                                                            }
                                                        />
                                                    }
                                                />
                                            </Grid>
                                        )
                                    )}
                                </Grid>
                            </GridContainer>
                        </dl>
                    )}
                    <dl>
                        <GridContainer>
                            <DataDetail
                                id="communicationPreference"
                                label="Actuaries’ communication preference"
                                children={
                                    submission.addtlActuaryCommunicationPreference &&
                                    ActuaryCommunicationRecord[
                                        submission
                                            .addtlActuaryCommunicationPreference
                                    ]
                                }
                                explainMissingData={!isSubmitted}
                            />
                        </GridContainer>
                    </dl>
                </>
            )}
        </section>
    )
}
