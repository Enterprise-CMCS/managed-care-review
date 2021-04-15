import React from 'react'
import { Alert, GridContainer, Grid } from '@trussworks/react-uswds'
import styles from './Landing.module.scss'

export const Landing = (): React.ReactElement => {
    return (
        <>
            <section className={styles.detailsSection}>
                <GridContainer className={styles.detailsSectionContent}>
                    <Alert type="info" heading="Test submissions only">
                        This system is still in development and is only accepting test submissions from a small number of pre-selected states. 
                        Test submissions must be complete at the time of submission and fully executed by all parties.
                    </Alert>
                    <Grid row gap className="margin-top-2">
                        <Grid tablet={{ col: 6 }}>
                            <div className={styles.detailsSteps}>
                                <h2>How it works</h2>
                                <ul>
                                    <li className={styles.login}>
                                        <span>Sign in with IDM</span>
                                        <span>Sign in using your IDM credentials</span>
                                    </li>
                                    <li className={styles.upload}>
                                        <span>Fill out form and upload documents</span>
                                        <span>Fill out the submission form and attach all relevant documentation.</span>
                                    </li>
                                    <li className={styles.email}>
                                        <span>Recieve an email confirmation</span>
                                        <span>After you submit, CMS will confirm receipt and start their review process.</span>
                                    </li>
                                </ul>
                            </div>    
                        </Grid>
                        <Grid tablet={{ col: 6 }}>
                            <h2>
                                You can submit capitation rates and contracts with managed care plans, including:
                            </h2>
                            <ul className={styles.detailsList}>
                                <li>
                                    Base contracts
                                </li>
                                <li>
                                    Contract amendments
                                </li>
                                <li>
                                    Rate certifications
                                </li>
                                <li>Amendments to rate certifications</li>
                            </ul>
                        </Grid>
                    </Grid>
                </GridContainer>
            </section>
        </>
    )
}
