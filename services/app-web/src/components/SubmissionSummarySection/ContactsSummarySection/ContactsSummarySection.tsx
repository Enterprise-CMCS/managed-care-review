import { Grid, GridContainer, Link } from '@trussworks/react-uswds'
import styles from '../SubmissionSummarySection.module.scss'
import { SectionHeader } from '../../SectionHeader'
import {
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
} from '../../../constants/healthPlanPackages'
import { HealthPlanFormDataType } from '../../../common-code/healthPlanFormDataType'
import { ActuaryContact } from '../../../common-code/healthPlanFormDataType'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'

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
    // Launch Darkly
    const ldClient = useLDClient()
    const showMultiRates = ldClient?.variation(
        featureFlags.MULTI_RATE_SUBMISSIONS.flag,
        featureFlags.MULTI_RATE_SUBMISSIONS.defaultValue
    )

    const handleActuaryTitle = (index: number) => {
        if (showMultiRates) {
            return 'Additional actuary contact'
        } else {
            return index ? 'Additional actuary contact' : 'Certifying actuary'
        }
    }

    /**
     * Multi-rate-submissions flag off:
     * Certifying actuary is displayed in Actuary Contacts second along with additional actuary contacts.
     *
     * We do this by combining the certifying actuary of the first-rate certification with the actuaries in
     * addtlActuaryContacts into one array.
     */
    const combineActuaries = () => {
        if (submission.rateInfos[0]?.actuaryContacts.length) {
            const certifyingActuary: ActuaryContact =
                submission.rateInfos[0]?.actuaryContacts[0]
            return [certifyingActuary, ...submission.addtlActuaryContacts]
        }
        return []
    }

    const actuaries = showMultiRates
        ? submission.addtlActuaryContacts
        : combineActuaries()

    return (
        <section id="stateContacts" className={styles.summarySection}>
            <dl>
                <SectionHeader
                    header="State contacts"
                    navigateTo={navigateTo}
                />

                <GridContainer>
                    <Grid row>
                        {submission.stateContacts.map((stateContact, index) => (
                            <Grid col={6} key={'statecontact_' + index}>
                                <span className="text-bold">
                                    Contact {index + 1}
                                </span>
                                <br />
                                <address>
                                    {stateContact.name}
                                    <br />
                                    {stateContact.titleRole}
                                    <br />
                                    <Link
                                        href={`mailto:${stateContact.email}`}
                                        target="_blank"
                                        variant="external"
                                        rel="noreferrer"
                                    >
                                        {stateContact.email}
                                    </Link>
                                    <br />
                                </address>
                            </Grid>
                        ))}
                    </Grid>
                </GridContainer>
            </dl>

            {submission.submissionType === 'CONTRACT_AND_RATES' && (
                <>
                    <dl>
                        <SectionHeader
                            header={
                                showMultiRates
                                    ? 'Additional actuary contacts'
                                    : 'Actuary contacts'
                            }
                        />
                        <GridContainer>
                            <Grid row>
                                {actuaries.map((actuaryContact, index) => (
                                    <Grid
                                        col={6}
                                        key={'actuarycontact_' + index}
                                    >
                                        <span className="text-bold">
                                            {handleActuaryTitle(index)}
                                        </span>
                                        <br />
                                        <address>
                                            {actuaryContact.name}
                                            <br />
                                            {actuaryContact.titleRole}
                                            <br />
                                            <Link
                                                href={`mailto:${actuaryContact.email}`}
                                                target="_blank"
                                                variant="external"
                                                rel="noreferrer"
                                            >
                                                {actuaryContact.email}
                                            </Link>
                                            <br />
                                            {getActuaryFirm(actuaryContact)}
                                        </address>
                                    </Grid>
                                ))}
                            </Grid>
                        </GridContainer>
                    </dl>
                    <dl>
                        <GridContainer>
                            <Grid row>
                                <span className="text-bold">
                                    {showMultiRates
                                        ? 'Actuaries’ communication preference'
                                        : 'Actuary communication preference'}
                                </span>
                                {submission.addtlActuaryCommunicationPreference
                                    ? ActuaryCommunicationRecord[
                                          submission
                                              .addtlActuaryCommunicationPreference
                                      ]
                                    : ''}
                            </Grid>
                        </GridContainer>
                    </dl>
                </>
            )}
        </section>
    )
}
