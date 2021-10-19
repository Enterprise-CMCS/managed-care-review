import React from 'react'
import { Button, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import { LoginStatusType } from '../../../contexts/AuthContext'
import { User } from '../../../gen/gqlClient'
import { idmRedirectURL } from '../../../pages/Auth/cognitoAuth'
import { AuthModeType } from '../../../common-code/domain-models'

import styles from '../Header.module.scss'

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

export const UserLoginInfo = ({
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
    return user
        ? LoggedInUserInfo(user, logout)
        : loginStatus === 'LOADING'
        ? null
        : LoggedOutUserInfo(authMode)
}
