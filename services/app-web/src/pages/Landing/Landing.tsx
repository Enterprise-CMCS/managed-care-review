import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import styles from './Landing.module.scss'
import { featureFlags } from '../../common-code/featureFlags'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { useLocation } from 'react-router-dom'
import { ErrorAlertSiteUnavailable } from '../../components/ErrorAlert/ErrorAlertSiteUnavailable'
import { ErrorAlertSignIn } from '../../components/ErrorAlert/ErrorAlertSignIn'

export const Landing = (): React.ReactElement => {
    const location = useLocation()
    const ldClient = useLDClient()
    const siteMaintenanceBanner: boolean = ldClient?.variation(
        featureFlags.SITE_MAINTENANCE_BANNER,
        false
    )

    const redirectFromSessionTimeout = new URLSearchParams(location.search).get(
        'session-timeout'
    )

    return (
        <>
            <section className={styles.detailsSection}>
                <GridContainer className={styles.detailsSectionContent}>
                    {siteMaintenanceBanner && <ErrorAlertSiteUnavailable />}
                    {redirectFromSessionTimeout && !siteMaintenanceBanner && (
                        <ErrorAlertSignIn />
                    )}
                    <Grid row gap className="margin-top-2">
                        <Grid tablet={{ col: 6 }}>
                            <div className={styles.detailsSteps}>
                                <h2>How it works</h2>
                                <ul>
                                    <li className={styles.login}>
                                        <span>Sign in with IDM</span>
                                        <span>
                                            Sign in using your IDM credentials.
                                        </span>
                                    </li>
                                    <li className={styles.upload}>
                                        <span>
                                            Fill out form and upload documents
                                        </span>
                                        <span>
                                            Fill out the submission form and
                                            attach all relevant documentation.
                                        </span>
                                    </li>
                                    <li className={styles.email}>
                                        <span>
                                            Receive an email confirmation
                                        </span>
                                        <span>
                                            After you submit, CMS will confirm
                                            receipt and start their review
                                            process.
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </Grid>
                        <Grid tablet={{ col: 6 }}>
                            <h2>You can use MC-Review to submit:</h2>
                            <ul className={styles.detailsList}>
                                <li>Base contracts</li>
                                <li>Amendments to base contracts</li>
                                <li>Rate certifications</li>
                                <li>Amendments to rate certifications</li>
                            </ul>

                            <h3>Not accepted by MC-Review at this time:</h3>
                            <ul className={styles.detailsList}>
                                <li>
                                    Non health plan submissions (EBRK, EQRO,
                                    dual demonstration contracts)
                                </li>
                                <li>State directed preprints</li>
                                <li>Rate-only submissions</li>
                            </ul>

                            <h2>Before you begin:</h2>
                            <ul className={styles.detailsList}>
                                <li>
                                    Each MC-Review submission can contain only
                                    <strong> one</strong> contract action
                                </li>
                                <li>
                                    Each contract action can tie to one or more
                                    managed care programs
                                </li>
                                <li>
                                    Contracts may be fully executed or
                                    unexecuted by some or all parties
                                </li>
                            </ul>
                        </Grid>
                    </Grid>
                </GridContainer>
            </section>
        </>
    )
}
