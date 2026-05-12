import React from 'react'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { RoutesRecord } from '@mc-review/constants'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as HHSIcon } from '../../assets/icons/depthealthhumanservices_usa.svg'
import { ReactComponent as HHSIcon2026 } from '../../assets/icons/depthealthhumanservices_usa_2026.svg'
import styles from './Footer.module.scss'
import { Logo } from '../Logo'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import { useStringConstants } from '../../hooks/useStringConstants'
import { useCurrentRoute } from '../../hooks/useCurrentRoute'
import { ContactSupportLink } from '../ErrorAlert/ContactSupportLink'
import { ReactRouterLinkWithLogging } from '../TealiumLogging'

type FooterContentProps = {
    mailToSupport: string
}

const LegacyFooterContent = ({
    mailToSupport,
}: FooterContentProps): React.ReactElement => (
    <>
        <div className={styles.logosRow}>
            <GridContainer>
                <Grid row className="flex-justify flex-align-center">
                    <div className={styles.cmsLogos}>
                        <Logo
                            src={medicaidLogo}
                            alt="Medicaid.gov-Keeping America Healthy"
                        />
                    </div>
                    <span className={styles.federalLogos}>
                        <HHSIcon
                            role="img"
                            aria-label="Department of Health & Human Services logo"
                        />
                        <span>
                            A federal government website managed and paid for by
                            the U.S. Centers for Medicare and Medicaid Services
                            and part of the MACPro suite.
                        </span>
                    </span>
                </Grid>
            </GridContainer>
        </div>
        <div className={styles.contactRow}>
            <GridContainer>
                <Grid row className="flex-justify flex-align-center">
                    <span>
                        Email&nbsp;
                        <ContactSupportLink alternateText={mailToSupport} />
                        &nbsp;to get help or send feedback
                    </span>
                    <span>7500 Security Boulevard Baltimore, MD 21244</span>
                </Grid>
            </GridContainer>
        </div>
    </>
)

const ResourcesNavFooterContent = ({
    mailToSupport: _mailToSupport,
}: FooterContentProps): React.ReactElement => {
    const medicaidLogo2026 = new URL(
        '../../assets/images/medicaidgovlogo_2026.svg',
        import.meta.url
    ).href

    return (
        <>
            <div className={styles.logosRow}>
                <GridContainer>
                    <Grid row className="flex-justify flex-align-center">
                        <div className={styles.cmsLogos}>
                            <Logo
                                src={medicaidLogo2026}
                                alt="Medicaid.gov-Keeping America Healthy"
                            />
                        </div>
                        <span className={styles.resourcesNavFederalLogos}>
                            <HHSIcon2026
                                role="img"
                                aria-label="Department of Health & Human Services logo"
                            />
                            <p className={styles.resourcesNavFederalText}>
                                A federal government website managed and paid
                                for by the U.S. Centers for Medicare & Medicaid
                                Services. 7500 Security Boulevard, Baltimore, MD
                                21244
                            </p>
                        </span>
                    </Grid>
                </GridContainer>
            </div>
            <div
                className={`${styles.contactRow} ${styles.resourcesNavContactRow}`}
            >
                <GridContainer>
                    <Grid row className={styles.resourcesNavLinks}>
                        <ReactRouterLinkWithLogging
                            to={RoutesRecord.HELP}
                            className={styles.footerNavLink}
                        >
                            Submission form guidance
                        </ReactRouterLinkWithLogging>
                        <ReactRouterLinkWithLogging
                            to={RoutesRecord.RESOURCES_TRAINING}
                            className={styles.footerNavLink}
                        >
                            Resources and Training
                        </ReactRouterLinkWithLogging>
                        <ReactRouterLinkWithLogging
                            to={RoutesRecord.CONTACT_US}
                            className={styles.footerNavLink}
                        >
                            Contact us
                        </ReactRouterLinkWithLogging>
                    </Grid>
                </GridContainer>
            </div>
        </>
    )
}

/**
 * CMS Footer
 */
export const Footer = (): React.ReactElement => {
    const stringConstants = useStringConstants()
    const { currentRoute: route } = useCurrentRoute()
    const ldClient = useLDClient()
    const showResourcesNavFooter = ldClient?.variation(
        featureFlags.RESOURCES_NAV_PAGES.flag,
        featureFlags.RESOURCES_NAV_PAGES.defaultValue
    )

    return route !== 'GRAPHQL_EXPLORER' ? (
        <footer>
            {showResourcesNavFooter ? (
                <ResourcesNavFooterContent
                    mailToSupport={stringConstants.MAIL_TO_SUPPORT}
                />
            ) : (
                <LegacyFooterContent
                    mailToSupport={stringConstants.MAIL_TO_SUPPORT}
                />
            )}
        </footer>
    ) : (
        <></>
    )
}
