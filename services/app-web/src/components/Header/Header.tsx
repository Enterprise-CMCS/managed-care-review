import { Grid, GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { NavLink } from 'react-router-dom'
import onemacLogo from '../../assets/images/onemac-logo.svg'
import { AuthModeType } from '../../common-code/config'
import { useCurrentRoute } from '../../hooks/useCurrentRoute'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { Logo } from '../Logo'
import styles from './Header.module.scss'
import { PageHeadingRow } from './PageHeadingRow/PageHeadingRow'
import { UserLoginInfo } from './UserLoginInfo/UserLoginInfo'

export type HeaderProps = {
    authMode: AuthModeType
    disableLogin?: boolean
}

/**
 * CMS Header
 */
export const Header = ({
    authMode,
    disableLogin = false,
}: HeaderProps): React.ReactElement => {
    const { logout, loggedInUser, loginStatus } = useAuth()
    const { heading } = usePage()
    const { currentRoute: route } = useCurrentRoute()

    const handleLogout = async (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        await logout({ sessionTimeout: false })
    }

    return (
        <header>
            <div className={styles.banner}>
                <GridContainer>
                    <Grid row className="flex-justify flex-align-center">
                        <NavLink className={styles.bannerLogo} to="/">
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
                            disableLogin={disableLogin}
                        />
                    </Grid>
                </GridContainer>
            </div>
            <PageHeadingRow
                heading={route !== 'UNKNOWN_ROUTE' ? heading : undefined}
                route={route}
                isLoading={loginStatus === 'LOADING'}
                loggedInUser={loggedInUser}
            />
        </header>
    )
}
