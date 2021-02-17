import React from 'react'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import styles from './Footer.module.scss'
import { Logo } from '../Logo/Logo'
import { GridContainer, Grid } from '@trussworks/react-uswds'

/**
 * CMS Footer
 */
export const Footer = (): React.ReactElement => {
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
                            <Logo
                                src={`https://s3-alpha-sig.figma.com/img/0148/2b8e/9c79359548ea7ee6343d869df292be66?Expires=1613952000&Signature=IiRbaoaVbKUSLomrgzK6zgRfCL4LtPKrRMsZNq77ZYaOFRSEu7E2sdeWAagq8LiS9ll8JhI4JcZjisavOIuCstPV9X-7FGa6ZdZ4zRIiw5E-sUoYw0TkQSs2wziQdcgzgTLd~LAjq-I6-a8rfllqaV62uVfkQWWiG~TwuZ7-wztONODrGrl7AcL2jr9QeAEJCtdILppqFprtSNft1finT3oChJqiVsSU3jN1gBDju42zbmYJEadNK2STdfFtlfOhU8lLsUlGITiNJ5CCzGhz2DPx7QtM~beq2XER-noxClV1fiFGMpEZRcSgI33JWtAAk93BAajJDNL9UtDnZvXU2A__&Key-Pair-Id=APKAINTVSUGEWH5XD5UA`}
                                alt="Federal government website"
                            />
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
                            Email mcrrspilot@cms.hhs.gov for help or support
                        </span>
                        <span>7500 Security Boulevard Baltimore, MD 21244</span>
                    </Grid>
                </GridContainer>
            </div>
        </footer>
    )
}
