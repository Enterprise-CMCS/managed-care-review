import React from 'react'
import { Button, Link, GridContainer, Grid } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import styles from './Header.module.scss'

import { Logo } from '../Logo/Logo'
import { StateIcon } from './StateIcon'
import { useAuth } from '../../contexts/AuthContext'
import { useHistory } from 'react-router-dom'

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

    const UserInfo = (): React.ReactElement => {
        return loggedInUser && isAuthenticated ? (
            <div className={styles.userInfo}>
                <span>{loggedInUser.email}</span>
                <span className={styles.divider}>|</span>

                <Button type="button" unstyled onClick={handleLogout}>
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
        )
    }

    const PageHeading = (): React.ReactElement => {
        return loggedInUser && isAuthenticated ? (
            <div className={styles.dashboardHeading}>
                <GridContainer>
                    <Grid row className="flex-align-center">
                        <div>
                            <StateIcon code={loggedInUser.state.code} />
                        </div>
                        <h1>
                            <span>{loggedInUser.state.name}</span>
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
                            Medicaid and CHIP Managed Care Reporting and Review
                            System
                        </span>
                    </h1>
                </GridContainer>
            </div>
        )
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
                        <UserInfo />
                    </Grid>
                </GridContainer>
            </div>
            <PageHeading />
        </header>
    )
}
