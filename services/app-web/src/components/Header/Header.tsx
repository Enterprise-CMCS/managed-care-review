import React from 'react'
import { Alert, GridContainer, Grid } from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'

import onemacLogo from '../../assets/images/onemac-logo.svg'
import { getRouteName } from '../../constants/routes'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { AuthModeType } from '../../common-code/domain-models'
import { Logo } from '../Logo'

import { PageHeadingRow } from './PageHeadingRow'
import { UserLoginInfo } from './UserLoginInfo'

import styles from './Header.module.scss'

export type HeaderProps = {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
}

/**
 * CMS Header
 */
export const Header = ({
    authMode,
    setAlert,
}: HeaderProps): React.ReactElement => {
    const { logout, loggedInUser, loginStatus } = useAuth()
    const history = useHistory()
    const { heading } = usePage()
    const route = getRouteName(history.location.pathname)

    const handleLogout = (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        if (!logout) {
            console.log('Something went wrong ', e)
            return
        }

        logout().catch(() => {
            setAlert &&
                setAlert(
                    <Alert
                        data-testid="Error400"
                        style={{ width: '600px', marginBottom: '5px' }}
                        type="error"
                        heading="Oops! Something went wrong"
                    />
                )
        })
        history.push('/')
    }

    return (
        <header>
            <div className={styles.banner}>
                <GridContainer>
                    <Grid row className="flex-justify flex-align-center">
                        <NavLink className={styles.bannerLogo} to="/dashboard">
                            <Logo
                                src={onemacLogo}
                                alt="One Mac"
                                className={styles.logoImg}
                            />
                            <span>Managed Care Review</span>
                        </NavLink>
                        <UserLoginInfo
                            user={loggedInUser}
                            loginStatus={loginStatus}
                            authMode={authMode}
                            logout={handleLogout}
                        />
                    </Grid>
                </GridContainer>
            </div>
            <PageHeadingRow
                heading={route !== 'UNKNOWN_ROUTE' ? heading : undefined}
                isLoading={loginStatus === 'LOADING'}
                loggedInUser={loggedInUser}
            />
        </header>
    )
}
