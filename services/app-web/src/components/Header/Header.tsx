import React from 'react'
import { Button, Link, GridContainer, Grid } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'
import styles from './Header.module.scss'

import { StateCode } from '../../common-code/domain-models'
import { Logo } from '../Logo/Logo'
import { useAuth } from '../../contexts/AuthContext'
import { useHistory } from 'react-router-dom'

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
    setAlert?: React.Dispatch<boolean>
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
    setAlert,
    user,
}: HeaderProps): React.ReactElement => {
    const { logout, isAuthenticated } = useAuth()
    const history = useHistory()

    const { stateName, StateIcon } = stateCode
        ? getStateInfo(stateCode)
        : { stateName: 'STATE UNKNOWN', StateIcon: () => <span></span> }

    const handleLogout = (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        if (!logout) {
            console.log('Something went wrong ', e)
            return
        }

        logout()
            .then(() => {
                console.log('Logout Success')
            })
            .catch((e) => {
                console.log('Logout failed HERE ', e)
                setAlert && setAlert(true)
            })
        history.push('/auth')
    }

    return (
        <header>
            <div className={styles.banner}>
                <GridContainer>
                    <Grid row className="flex-justify flex-align-center">
                        <NavLink to="/dashboard">
                            <Logo
                                src={medicaidLogo}
                                alt="Medicaid.gov-Keeping America Healthy"
                            />
                        </NavLink>
                        {isAuthenticated && user ? (
                            <div className={styles.userInfo}>
                                <span>{user.email}</span>
                                <span className={styles.divider}>|</span>

                                <Button
                                    type="button"
                                    unstyled
                                    onClick={handleLogout}
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
            {isAuthenticated ? (
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
                            <span className="text-bold">MAC-MCRRS</span>
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
