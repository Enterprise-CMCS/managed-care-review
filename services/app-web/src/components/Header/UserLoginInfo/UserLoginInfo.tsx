import React from 'react'

import { LoginStatusType } from '../../../contexts/AuthContext'
import { User } from '../../../gen/gqlClient'
import { idmRedirectURL } from '../../../pages/Auth/cognitoAuth'
import { AuthModeType } from '../../../common-code/config'

import styles from '../Header.module.scss'
import { useStringConstants } from '../../../hooks/useStringConstants'
import {
    NavLinkWithLogging,
    LinkWithLogging,
    ButtonWithLogging,
} from '../../../components'

type LogoutHandlerT = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
) => void

const LoggedInUserInfo = (
    user: User,
    logout: LogoutHandlerT
): React.ReactElement => {
    const stringConstants = useStringConstants()
    return (
        <div className={styles.userInfo}>
            <span>Contact </span>
            <LinkWithLogging
                href={stringConstants.MAIL_TO_SUPPORT_HREF}
                variant="unstyled"
                target="_blank"
                rel="noreferrer"
            >
                {stringConstants.MAIL_TO_SUPPORT}
            </LinkWithLogging>
            <span className={styles.divider}>|</span>
            <span>{user.email}</span>
            <span className={styles.divider}>|</span>

            <ButtonWithLogging
                type="button"
                unstyled
                parent_component_type="constant header"
                onClick={logout}
            >
                Sign out
            </ButtonWithLogging>
        </div>
    )
}

const LoggedOutUserInfo = (authMode: AuthModeType): React.ReactElement => {
    return authMode === 'IDM' ? (
        <LinkWithLogging
            className="usa-button usa-button--outline usa-button--inverse"
            variant="unstyled"
            href={idmRedirectURL()}
        >
            Sign In
        </LinkWithLogging>
    ) : (
        <NavLinkWithLogging
            className="usa-button usa-button--outline usa-button--inverse"
            variant="unstyled"
            to="/auth"
        >
            Sign In
        </NavLinkWithLogging>
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
