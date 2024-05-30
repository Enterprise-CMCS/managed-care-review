import { Grid, GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { NavLink } from 'react-router-dom'
import onemacLogo from '../../assets/images/onemac-logo.svg?react'
import { AuthModeType } from '../../common-code/config'
import { useCurrentRoute } from '../../hooks/useCurrentRoute'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { Logo } from '../Logo'
import styles from './Header.module.scss'
import { PageHeadingRow } from './PageHeadingRow/PageHeadingRow'
import { UserLoginInfo } from './UserLoginInfo/UserLoginInfo'
import { recordJSException } from '../../otelHelpers'
import { ErrorAlertSignIn } from '../ErrorAlert'

export type HeaderProps = {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
    disableLogin?: boolean
}

/**
 * CMS Header
 */
export const Header = ({
    authMode,
    setAlert,
    disableLogin = false,
}: HeaderProps): React.ReactElement => {
    const { logout, loggedInUser, loginStatus } = useAuth()
    const { heading } = usePage()
    const { currentRoute: route } = useCurrentRoute()

    const handleLogout = (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        if (!logout) {
            console.info('Something went wrong ', e)
            return
        }

        logout({ sessionTimeout: false }).catch((e) => {
            recordJSException(`Error with logout: ${e}`)
            setAlert && setAlert(<ErrorAlertSignIn />)
        })
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
