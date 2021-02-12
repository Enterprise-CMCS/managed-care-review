import React from 'react'
import { Button, GridContainer, Grid } from '@trussworks/react-uswds'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'
import styles from './Header.module.scss'

import { Logo } from '../Logo/Logo'

const getStateInfo = (
    stateAbbrev: SupportedStateCodes
): { stateName: string; StateIcon: React.FunctionComponent } => {
    switch (stateAbbrev) {
        case 'MN':
            return { stateName: 'Minnesota', StateIcon: MnIcon }
        case 'VA':
            return { stateName: 'Virginia', StateIcon: VaIcon }
        default:
            return {
                stateName: 'STATE UNKNOWN',
                StateIcon: () => <span></span>,
            }
    }
}

const StateCodes = {
    MN: 'MN',
    VA: 'VA',
} as const
type SupportedStateCodes = typeof StateCodes[keyof typeof StateCodes]

export type HeaderProps = {
    stateCode?: SupportedStateCodes
    activePage?: string
    loggedIn: boolean
    user?: {
        name: string
        email: string
    }
}

/**
 * CMS Header
 */
export const Header = ({
    stateCode,
    activePage = 'Managed Care Dashboard',
    loggedIn,
    user,
}: HeaderProps): React.ReactElement => {
    const { stateName, StateIcon } = stateCode
        ? getStateInfo(stateCode)
        : { stateName: 'STATE UNKNOWN', StateIcon: () => <span></span> }

    return (
        <header>
            <GridContainer>
                <Grid row className="flex-justify flex-align-center">
                    <Logo
                        src={medicaidLogo}
                        alt="Medicaid.gov-Keeping America Healthy"
                    />
                    {loggedIn && user ? (
                        <div className={styles.userInfo}>
                            <span>{user.email}</span>
                            <span className={styles.divider}>|</span>

                            <Button
                                type="button"
                                unstyled
                                onClick={() => console.log('Sign out')}
                            >
                                Sign out
                            </Button>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            outline
                            onClick={() => console.log('Sign In')}
                        >
                            Sign In
                        </Button>
                    )}
                </Grid>
            </GridContainer>
            {loggedIn ? (
                <div className={styles.dashboardHeading}>
                    <GridContainer>
                        <Grid row className="flex-align-center">
                            <div>
                                <StateIcon />
                            </div>
                            <h1>
                                <span>{stateName}</span>
                                <span className="font-heading-lg text-light">
                                    {activePage}
                                </span>
                            </h1>
                        </Grid>
                    </GridContainer>
                </div>
            ) : (
                <div className={styles.landingPageHeading}>
                    <GridContainer>
                        <h1>
                            <span className="text-bold">MAC-MCCRS</span>
                            <span className="font-heading-lg">
                                Medicaid and CHIP Managed Care Reporting and
                                Review System
                            </span>
                        </h1>
                    </GridContainer>
                </div>
            )}
        </header>
    )
}
