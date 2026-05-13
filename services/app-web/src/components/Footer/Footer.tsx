import React from 'react'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { RouteT } from '@mc-review/constants'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as HHSIcon } from '../../assets/icons/depthealthhumanservices_usa.svg'
import { ReactComponent as HHSIcon2026 } from '../../assets/icons/depthealthhumanservices_usa_2026.svg'
import styles from './Footer.module.scss'
import { FooterNavLinks } from './FooterNavLinks'
import { Logo } from '../Logo'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import { useStringConstants } from '../../hooks/useStringConstants'
import { useCurrentRoute } from '../../hooks/useCurrentRoute'
import { ContactSupportLink } from '../ErrorAlert/ContactSupportLink'

type LegacyFooterContentProps = {
    mailToSupport: string
}

const LegacyFooterContent = ({
    mailToSupport,
}: LegacyFooterContentProps): React.ReactElement => (
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

type ResourcesNavFooterContentProps = {
    route: RouteT | 'UNKNOWN_ROUTE'
}

export const ResourcesNavFooterContent = ({
    route,
}: ResourcesNavFooterContentProps): React.ReactElement => {
    const medicaidLogo2026 = new URL(
        '../../assets/images/medicaidgovlogo_2026.svg',
        import.meta.url
    ).href

    return (
        <>
            <div className={styles.resourcesNavLogosRow}>
                <GridContainer className={styles.resourcesNavContainer}>
                    <div className={styles.resourcesNavTopRow}>
                        <Logo
                            src={medicaidLogo2026}
                            alt="Medicaid.gov-Keeping America Healthy"
                            className={styles.resourcesNavLogo}
                        />
                        <div className={styles.resourcesNavFederalBlock}>
                            <HHSIcon2026
                                className={styles.resourcesNavFederalIcon}
                                role="img"
                                aria-label="Department of Health & Human Services logo"
                            />
                            <p className={styles.resourcesNavFederalText}>
                                A federal government website managed and paid
                                for by the U.S. Centers for Medicare & Medicaid
                                Services. 7500 Security Boulevard, Baltimore, MD
                                21244
                            </p>
                        </div>
                    </div>
                </GridContainer>
            </div>
            <div
                className={`${styles.contactRow} ${styles.resourcesNavContactRow}`}
            >
                <GridContainer className={styles.resourcesNavContainer}>
                    <Grid row className={styles.resourcesNavLinks}>
                        <FooterNavLinks route={route} />
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
                <ResourcesNavFooterContent route={route} />
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
