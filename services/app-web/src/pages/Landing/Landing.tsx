import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import styles from './Landing.module.scss'
import { featureFlags } from '@mc-review/common-code'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { useLocation } from 'react-router-dom'
import {
    ErrorAlertSiteUnavailable,
    ErrorAlertSessionExpired,
    ErrorAlertScheduledMaintenance,
    LinkWithLogging,
    ErrorAlertSignIn,
} from '../../components'

function maintenanceBannerForVariation(flag: string): React.ReactNode {
    if (flag === 'UNSCHEDULED') {
        return <ErrorAlertSiteUnavailable />
    } else if (flag === 'SCHEDULED') {
        return <ErrorAlertScheduledMaintenance />
    }
    return undefined
}

export const Landing = (): React.ReactElement => {
    const location = useLocation()
    const ldClient = useLDClient()
    const siteUnderMaintenanceBannerFlag: string = ldClient?.variation(
        featureFlags.SITE_UNDER_MAINTENANCE_BANNER.flag,
        featureFlags.SITE_UNDER_MAINTENANCE_BANNER.defaultValue
    )

    const maybeMaintenaceBanner = maintenanceBannerForVariation(
        siteUnderMaintenanceBannerFlag
    )

    const redirectFromSessionTimeout = new URLSearchParams(location.search).get(
        'session-timeout'
    )

    const redirectFromSigninError = new URLSearchParams(location.search).get(
        'signin-error'
    )
    return (
        <>
            <section className={styles.detailsSection}>
                <GridContainer className={styles.detailsSectionContent}>
                    {maybeMaintenaceBanner}
                    {redirectFromSessionTimeout && !maybeMaintenaceBanner && (
                        <ErrorAlertSessionExpired />
                    )}
                    {redirectFromSigninError && !maybeMaintenaceBanner && (
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
                            <h2 className="margin-top-0">
                                Submit your managed care health plans to CMS for
                                review
                            </h2>
                            <h4>MC-Review accepts</h4>

                            <ol className={styles.detailsList}>
                                <li>
                                    Medicaid and CHIP managed care health plan
                                    submissions, including
                                    <ul>
                                        <li>
                                            Base contracts and amendments to
                                            base contracts
                                        </li>
                                        <li>
                                            Rate certifications and rate
                                            amendments
                                        </li>
                                        <li>
                                            Contracts related to Dual Eligible
                                            Special Needs Plans (D-SNPs) with
                                            Medicaid-covered benefits
                                        </li>
                                        <li>
                                            <LinkWithLogging
                                                aria-label="Required supporting documents"
                                                href={'/help#key-documents'}
                                            >
                                                Required supporting documents
                                            </LinkWithLogging>
                                        </li>
                                    </ul>
                                </li>
                                <li>
                                    External Quality Review Organization (EQRO)
                                    submissions, including
                                    <ul>
                                        <li>
                                            Base contracts and amendments to
                                            base contracts
                                        </li>
                                        <li>
                                            <LinkWithLogging
                                                aria-label="Required supporting documents"
                                                href={'/help#key-documents'}
                                            >
                                                Supporting documents
                                            </LinkWithLogging>
                                        </li>
                                    </ul>
                                </li>
                            </ol>

                            <h4>Not accepted by MC-Review at this time</h4>
                            <ol className={styles.detailsList}>
                                <li>
                                    Some Medicaid and CHIP managed care health
                                    plan submissions, including
                                    <ul>
                                        <li>
                                            Contracts without Medicaid-covered
                                            benefits
                                        </li>
                                        <li>
                                            Programs of All-Inclusive Care for
                                            the Elderly (PACE), and dual
                                            demonstration contracts
                                        </li>
                                    </ul>
                                </li>
                                <li>Enrollment Broker (EB) submissions</li>
                                <li>State Directed Preprints (SDP)</li>
                            </ol>
                        </Grid>
                    </Grid>
                </GridContainer>
            </section>
        </>
    )
}
