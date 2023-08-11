import React from 'react'
import { Button, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import { LoginStatusType } from '../../../contexts/AuthContext'
import { User } from '../../../gen/gqlClient'
import { idmRedirectURL } from '../../../pages/Auth/cognitoAuth'
import { AuthModeType } from '../../../common-code/config'

import styles from '../Header.module.scss'
import { useStringConstants } from '../../../hooks/useStringConstants'

type LogoutHandlerT = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
) => void

const LoggedInUserInfo = (
    user: User,
    logout: LogoutHandlerT
): React.ReactElement => {
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT
    return (
        <div className={styles.userInfo}>
            <span>Contact </span>
            <a
                href={`mailto: ${MAIL_TO_SUPPORT}, mc-review-team@truss.works`}
                className="usa-link"
                target="_blank"
                rel="noreferrer"
            >
                {MAIL_TO_SUPPORT}
            </a>
            <span className={styles.divider}>|</span>
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
    disableLogin,
}: {
    user: User | undefined
    loginStatus: LoginStatusType
    authMode: AuthModeType
    logout: LogoutHandlerT
    disableLogin: boolean
}): React.ReactElement | null => {
    if (loginStatus === 'LOADING' || disableLogin) {
        return user ? LoggedInUserInfo(user, logout) : null
    } else {
        return user
            ? LoggedInUserInfo(user, logout)
            : LoggedOutUserInfo(authMode)
    }
}
