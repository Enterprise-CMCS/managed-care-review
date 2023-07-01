import React from 'react'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as HHSIcon } from '../../assets/icons/depthealthhumanservices_usa.svg'
import styles from './Footer.module.scss'
import { Logo } from '../Logo'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import { useStringConstants } from '../../hooks/useStringConstants'

/**
 * CMS Footer
 */
export const Footer = (): React.ReactElement => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT
    return (
        <footer>
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
                            <HHSIcon title="Federal government website" />
                            <span>
                                A federal government website managed and paid
                                for by the U.S. Centers for Medicare and
                                Medicaid Services and part of the MACPro suite.
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
                            <a
                                href={`mailto: ${MAIL_TO_SUPPORT}, mc-review-team@truss.works`}
                                className="usa-link"
                                target="_blank"
                                rel="noreferrer"
                            >
                                {MAIL_TO_SUPPORT}
                            </a>
                            &nbsp;to get help or send feedback
                        </span>
                        <span>7500 Security Boulevard Baltimore, MD 21244</span>
                    </Grid>
                </GridContainer>
            </div>
        </footer>
    )
}
