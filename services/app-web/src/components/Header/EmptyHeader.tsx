import { Grid, GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import onemacLogo from '../../assets/images/onemac-logo.svg?react'
import { Logo } from '../Logo'
import styles from './Header.module.scss'

/**
 * MC-Review Empty Header - this wrapper does not require any data on the page to display.
 * For use on full page crashes in ErrorBoundaryRoot
 */
export const EmptyHeader = ({
    children,
}: {
    children: React.ReactNode
}): React.ReactElement => {
    return (
        <header>
            <div className={styles.banner}>
                <GridContainer>
                    <Grid row className="flex-justify flex-align-center">
                        <div className={styles.bannerLogo}>
                            <Logo
                                src={onemacLogo}
                                alt="One Mac"
                                className={styles.logoImg}
                            />
                            <span>Managed Care Review</span>
                        </div>
                        {children}
                    </Grid>
                </GridContainer>
            </div>
        </header>
    )
}
