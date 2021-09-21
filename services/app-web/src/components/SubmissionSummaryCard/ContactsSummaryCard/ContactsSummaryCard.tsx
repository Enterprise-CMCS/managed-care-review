import { Grid, GridContainer } from '@trussworks/react-uswds'
import styles from '../SubmissionSummaryCard.module.scss'
import { SubmissionSummaryCardProps, CardHeader } from '..'
import {
    ActuaryFirmsRecord,
    ActuaryCommunicationRecord,
} from '../../../constants/submissions'

export const ContactsSummaryCard = ({
    submission,
    editable,
    to,
}: SubmissionSummaryCardProps): React.ReactElement => {
    return (
        <section id="stateContacts" className={styles.reviewSection}>
            <dl>
                <CardHeader
                    header="State contacts"
                    editable={editable}
                    to={to}
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
                                    <a href={`mailto:${stateContact.email}`}>
                                        {stateContact.email}
                                    </a>
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
                        <div className={styles.reviewSectionSubHeader}>
                            <h2>Actuary contacts</h2>
                        </div>
                        <GridContainer>
                            <Grid row>
                                {submission.actuaryContacts.map(
                                    (actuaryContact, index) => (
                                        <Grid
                                            col={6}
                                            key={'actuarycontact_' + index}
                                        >
                                            <span className="text-bold">
                                                {index
                                                    ? 'Additional actuary contact'
                                                    : 'Certifying actuary'}
                                            </span>
                                            <br />
                                            <address>
                                                {actuaryContact.name}
                                                <br />
                                                {actuaryContact.titleRole}
                                                <br />
                                                <a
                                                    href={`mailto:${actuaryContact.email}`}
                                                >
                                                    {actuaryContact.email}
                                                </a>
                                                <br />
                                                {actuaryContact.actuarialFirm ===
                                                'OTHER' ? (
                                                    <>
                                                        {
                                                            actuaryContact.actuarialFirmOther
                                                        }
                                                    </>
                                                ) : (
                                                    <>
                                                        {/*TODO: make this more clear, a const or something */}
                                                        {actuaryContact.actuarialFirm
                                                            ? ActuaryFirmsRecord[
                                                                  actuaryContact
                                                                      .actuarialFirm
                                                              ]
                                                            : ''}
                                                    </>
                                                )}
                                            </address>
                                        </Grid>
                                    )
                                )}
                            </Grid>
                        </GridContainer>
                    </dl>
                    <dl>
                        <GridContainer>
                            <Grid row>
                                <span className="text-bold">
                                    Actuary communication preference
                                </span>
                                {submission.actuaryCommunicationPreference
                                    ? ActuaryCommunicationRecord[
                                          submission
                                              .actuaryCommunicationPreference
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
