import React from 'react'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as HHSIcon } from '../../assets/icons/depthealthhumanservices_usa.svg'
import styles from './Footer.module.scss'
import { Logo } from '../Logo'
import { GridContainer, Grid } from '@trussworks/react-uswds'
import { useStringConstants } from '../../hooks/useStringConstants'
import { useCurrentRoute } from '../../hooks/useCurrentRoute'
import { ContactSupportLink } from '../ErrorAlert/ContactSupportLink'

/**
 * CMS Footer
 */
export const Footer = (): React.ReactElement => {
    const stringConstants = useStringConstants()
    const { currentRoute: route } = useCurrentRoute()

    return route !== 'GRAPHQL_EXPLORER' ? (
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
                            <HHSIcon />
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
                            <ContactSupportLink alternateText={stringConstants.MAIL_TO_SUPPORT}/>
                            &nbsp;to get help or send feedback
                        </span>
                        <span>7500 Security Boulevard Baltimore, MD 21244</span>
                    </Grid>
                </GridContainer>
            </div>
        </footer>
    ) : (
        <></>
    )
}
