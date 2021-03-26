import React from 'react'
import { Button, Link, GridContainer, Grid } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import { idmRedirectURL } from '../../pages/Auth/cognitoAuth'
import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import styles from './Header.module.scss'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { AuthModeType } from '../../common-code/domain-models'

import { Logo } from '../Logo/Logo'
import { PageHeading } from './PageHeading'
import { User } from '../../gen/gqlClient'

export type HeaderProps = {
    authMode: AuthModeType
    activePage?: string
    setAlert?: React.Dispatch<boolean>
}

/**
 * CMS Header
 */
export const Header = ({
    authMode,
    activePage = 'Managed Care Dashboard',
    setAlert,
}: HeaderProps): React.ReactElement => {
    const { logout, loggedInUser, loginStatus } = useAuth()
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

    const LoggedInUserInfo = (user: User): React.ReactElement => {
        return (
            <div className={styles.userInfo}>
                <span>{user.email}</span>
                <span className={styles.divider}>|</span>

                <Button type="button" unstyled onClick={handleLogout}>
                    Sign out
                </Button>
            </div>
        )
    }

    const LoggedOutUserInfo = (authMode: AuthModeType): React.ReactElement => {
        return authMode === 'IDM' ? (
            <Link
                className="usa-button usa-button--outline"
                variant="unstyled"
                href={idmRedirectURL()}
            >
                Sign In
            </Link>
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

    const UserInfo = (): React.ReactElement | null => {
        return loggedInUser
            ? LoggedInUserInfo(loggedInUser)
            : loginStatus === 'LOADING'
            ? null
            : LoggedOutUserInfo(authMode)
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
            <PageHeading
                heading={activePage}
                isLoading={loginStatus === 'LOADING'}
                loggedInUser={loggedInUser}
            />
        </header>
    )
}
