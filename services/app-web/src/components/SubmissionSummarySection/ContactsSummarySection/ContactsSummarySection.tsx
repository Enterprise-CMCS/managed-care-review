import { Grid, GridContainer } from '@trussworks/react-uswds'
import styles from '../SubmissionSummarySection.module.scss'
import { SectionHeader } from '../../SectionHeader'
import {
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
} from '../../../constants/healthPlanPackages'
import { HealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { ActuaryContact } from '../../../common-code/healthPlanFormDataType'
import { DataDetailMissingField } from '../../DataDetail/DataDetailMissingField'
import { DataDetail, DataDetailContactField } from '../../DataDetail'

export type ContactsSummarySectionProps = {
    submission: HealthPlanFormDataType
    navigateTo?: string
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
    navigateTo,
}: ContactsSummarySectionProps): React.ReactElement => {
    const isSubmitted = submission.status === 'SUBMITTED'

    return (
        <section id="stateContacts" className={styles.summarySection}>
            <dl>
                <SectionHeader
                    header="State contacts"
                    navigateTo={navigateTo}
                />

                <GridContainer>
                    <Grid row>
                        {submission.stateContacts.length > 0 ? (
                            submission.stateContacts.map(
                                (stateContact, index) => (
                                    <Grid col={6} key={'statecontact_' + index}>
                                        <DataDetail
                                            id={'statecontact_' + index}
                                            label={`Contact ${index + 1}`}
                                            data={
                                                <DataDetailContactField
                                                    contact={stateContact}
                                                />
                                            }
                                        />
                                    </Grid>
                                )
                            )
                        ) : (
                            <DataDetailMissingField />
                        )}
                    </Grid>
                </GridContainer>
            </dl>

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
                                                    data={
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
                                data={
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
