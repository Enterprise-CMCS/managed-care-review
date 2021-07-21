import React, { useEffect } from 'react'
import {
    Alert,
    Button,
    Link,
    GridContainer,
    Grid,
} from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import { idmRedirectURL } from '../../pages/Auth/cognitoAuth'
import onemacLogo from '../../assets/images/onemac-logo.svg'
import styles from './Header.module.scss'

import { getRouteName } from '../../constants/routes'
import { useHistory } from 'react-router-dom'
import { LoginStatusType, useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { AuthModeType } from '../../common-code/domain-models'
import { Logo } from '../Logo/Logo'
import { PageHeadingRow } from './PageHeadingRow'
import { User } from '../../gen/gqlClient'

export type HeaderProps = {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
}

type LogoutHandlerT = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
) => void

const LoggedInUserInfo = (
    user: User,
    logout: LogoutHandlerT
): React.ReactElement => {
    return (
        <div className={styles.userInfo}>
            <span>{user.email}</span>
            <span className={styles.divider}>|</span>

            <Button type="button" unstyled onClick={logout}>
                Sign out
            </Button>
        </div>
    )
}

const LoggedOutUserInfo = (authMode: AuthModeType): React.ReactElement => {
    return authMode === 'IDM' ? (
        <Link
            className="usa-button usa-button--outline usa-button--inverse"
            variant="unstyled"
            href={idmRedirectURL()}
        >
            Sign In
        </Link>
    ) : (
        <Link
            asCustom={NavLink}
            className="usa-button usa-button--outline usa-button--inverse"
            variant="unstyled"
            to="/auth"
        >
            Sign In
        </Link>
    )
}

const UserInfo = ({
    user,
    loginStatus,
    authMode,
    logout,
}: {
    user: User | undefined
    loginStatus: LoginStatusType
    authMode: AuthModeType
    logout: LogoutHandlerT
}): React.ReactElement | null => {
    useEffect(() => {
        console.log("I'm MOUNTING")
        return () => {
            console.log("I'm UNMOUNTING")
        }
    }, [])

    console.log('GETTING USER INFO,', user, loginStatus, authMode)
    return user
        ? LoggedInUserInfo(user, logout)
        : loginStatus === 'LOADING'
        ? null
        : LoggedOutUserInfo(authMode)
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

    useEffect(() => {
        console.log('MOUNTING THE WHOLE HEADER')
        return () => {
            console.log('UNMOUNTING THE WHOLE HEADER')
        }
    }, [])

    console.log(
        'REDER WHY',
        authMode,
        loggedInUser,
        loginStatus,
        heading,
        authMode,
        setAlert
    )

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

    console.log('RENDER HEADERINGIN')

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
                        <UserInfo
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
