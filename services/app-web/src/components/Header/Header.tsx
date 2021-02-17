import React from 'react'
import { Button, Link, GridContainer, Grid } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'
import styles from './Header.module.scss'

import { StateCode } from '../../common-code/domain-models'
import { useAuth } from '../../pages/App/AuthContext'
import { Logo } from '../Logo/Logo'

const getStateInfo = (
    stateAbbrev: StateCode
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

export type HeaderProps = {
    stateCode?: StateCode
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
    const { logout } = useAuth() // seems weird that we don't pass this in
    const { stateName, StateIcon } = stateCode
        ? getStateInfo(stateCode)
        : { stateName: 'STATE UNKNOWN', StateIcon: () => <span></span> }

    return (
        <header>
            <div className={styles.banner}>
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
                                    onClick={() => {
                                        logout &&
                                            logout()
                                                .then(() => {
                                                    console.log(
                                                        'button level good.'
                                                    )
                                                })
                                                .catch((e) => {
                                                    console.log(
                                                        'button level bad.',
                                                        e
                                                    )
                                                })
                                    }}
                                >
                                    Sign out
                                </Button>
                            </div>
                        ) : (
                            <Link
                                asCustom={NavLink}
                                className="usa-button usa-button--outline"
                                variant="unstyled"
                                to="/auth"
                            >
                                Sign In
                            </Link>
                        )}
                    </Grid>
                </GridContainer>
            </div>
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
                            <span>MAC-MCCRS</span>
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
