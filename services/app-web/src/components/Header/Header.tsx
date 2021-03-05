import React from 'react'
import { Button, Link, GridContainer, Grid } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import { ReactComponent as VaIcon } from '../../assets/icons/va-icon.svg'
import { ReactComponent as MnIcon } from '../../assets/icons/mn-icon.svg'
import styles from './Header.module.scss'

import { Logo } from '../Logo/Logo'
import { useAuth } from '../../contexts/AuthContext'
import { useHistory } from 'react-router-dom'

const StateIcon = ({ code }: { code: string }): React.ReactElement => {
    switch (code) {
        case 'MN':
            return <MnIcon />
        case 'VA':
            return <VaIcon />
        default:
            return <span>STATE UNKNOWN</span>
    }
}

export type HeaderProps = {
    activePage?: string
    setAlert?: React.Dispatch<boolean>
}

/**
 * CMS Header
 */
export const Header = ({
    activePage = 'Managed Care Dashboard',
    setAlert,
}: HeaderProps): React.ReactElement => {
    const { logout, loggedInUser, isAuthenticated } = useAuth()
    const history = useHistory()
    const {
        state = {
            name: 'STATE UNKNOWN',
        },
    } = loggedInUser || {}

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
            .catch(() => {
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
                        {isAuthenticated && loggedInUser ? (
                            <div className={styles.userInfo}>
                                <span>{loggedInUser.email}</span>
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
                                <StateIcon
                                    code={loggedInUser?.state.code || 'VA'}
                                />
                            </div>
                            <h1>
                                <span>{state.name}</span>
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
