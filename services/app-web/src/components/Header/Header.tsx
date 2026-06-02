import { Grid, GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { NavLink } from 'react-router-dom'
import { AuthModeType } from '@mc-review/common-code'
import { useCurrentRoute } from '../../hooks'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { Logo } from '../Logo'
import styles from './Header.module.scss'
import { PageHeadingRow } from './PageHeadingRow/PageHeadingRow'
import { PublicNavigation } from './PublicNavigation/PublicNavigation'
import { UserLoginInfo } from './UserLoginInfo/UserLoginInfo'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'

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
    const onemacLogo = new URL(
        '../../assets/images/onemac-logo.svg',
        import.meta.url
    ).href
    const { logout, loggedInUser, loginStatus } = useAuth()
    const { heading } = usePage()
    const { currentRoute: route, pathname } = useCurrentRoute()
    const ldClient = useLDClient()
    const showResourcesNavPages: boolean = ldClient?.variation(
        featureFlags.RESOURCES_NAV_PAGES.flag,
        featureFlags.RESOURCES_NAV_PAGES.defaultValue
    )
    const shouldShowPublicNavigation =
        loginStatus === 'LOGGED_OUT' &&
        showResourcesNavPages &&
        [
            'ROOT',
            'UNKNOWN_ROUTE',
            'RESOURCES',
            'HELP',
            'CONTACT_US',
            'RESOURCES_TRAINING',
        ].includes(route)

    const handleLogout = async () => {
        await logout({ type: 'DEFAULT' })
        // no need to handle errors, logout will handle
    }

    return route !== 'GRAPHQL_EXPLORER' ? (
        <header>
            <div className={styles.banner}>
                <GridContainer className={styles.bannerContainer}>
                    <Grid row className="flex-justify flex-align-center">
                        <NavLink className={styles.bannerLogo} to="/">
                            <Logo
                                src={onemacLogo}
                                alt="One Mac logo"
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
            {shouldShowPublicNavigation && (
                <PublicNavigation route={route} pathname={pathname} />
            )}
            <PageHeadingRow
                heading={route !== 'UNKNOWN_ROUTE' ? heading : undefined}
                route={route}
                isLoading={loginStatus === 'LOADING'}
                loggedInUser={loggedInUser}
            />
        </header>
    ) : (
        <></>
    )
}
