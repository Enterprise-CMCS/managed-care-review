import React from 'react'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import styles from './Landing.module.scss'
import { featureFlags } from '../../common-code/featureFlags'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { useLocation } from 'react-router-dom'
import {
    ErrorAlertSiteUnavailable,
    ErrorAlertSessionExpired,
    ErrorAlertScheduledMaintenance,
    LinkWithLogging,
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

    return (
        <>
            <section className={styles.detailsSection}>
                <GridContainer className={styles.detailsSectionContent}>
                    {maybeMaintenaceBanner}
                    {redirectFromSessionTimeout && !maybeMaintenaceBanner && (
                        <ErrorAlertSessionExpired />
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
                            <p className="line-height-sans-4 measure-6">
                                You can use MC-Review to submit Medicaid and
                                CHIP managed care health plan contracts and
                                rates to CMS. This portal accepts:
                            </p>
                            <ul className={styles.detailsList}>
                                <li>
                                    Base contracts and amendments to base
                                    contracts
                                </li>
                                <li>Rate certifications and rate amendments</li>
                                <li>
                                    <LinkWithLogging
                                        aria-label="Document definitions and requirements"
                                        href={'/help#key-documents'}
                                    >
                                        Required supporting documents
                                    </LinkWithLogging>{' '}
                                    related to the above
                                </li>
                            </ul>

                            <h3>Not accepted by MC-Review at this time:</h3>
                            <ul className={styles.detailsList}>
                                <li>State directed preprints</li>
                                <li>Rate-only submissions</li>
                                <li>
                                    Non-health plan submissions such as External
                                    Quality Review Organization (EQRO) or
                                    enrollment broker
                                </li>
                                <li>
                                    Submissions related to programs for
                                    dual-eligible beneficiaries, such as Dual
                                    Eligible Special Needs Plans (D-SNP),
                                    Programs of All-Inclusive Care for the
                                    Elderly (PACE), dual demonstration contracts
                                </li>
                            </ul>
                        </Grid>
                    </Grid>
                </GridContainer>
            </section>
        </>
    )
}
