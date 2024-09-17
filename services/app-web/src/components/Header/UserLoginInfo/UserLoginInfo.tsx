import React, { useState } from 'react'

import { LoginStatusType, useAuth } from '../../../contexts/AuthContext'
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
import { ContactSupportLink } from '../../ErrorAlert/ContactSupportLink'
import { NavDropDownButton, Menu } from '@trussworks/react-uswds'
import { useTealium } from '../../../hooks'

type LogoutHandlerT = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
) => void

const LoggedInUserInfo = (
    user: User,
    logout: LogoutHandlerT
): React.ReactElement => {
    const stringConstants = useStringConstants()
    const [isOpen, setIsOpen] = useState(false)
    const { logButtonEvent } = useTealium()
    const { loggedInUser } = useAuth()

    const isStateUser = loggedInUser?.role === 'STATE_USER'

    const onToggle = (): void => {
        logButtonEvent({
            text: 'Your account',
            button_type: 'button',
            button_style: 'unstyled',
            parent_component_type: 'constant header',
        })
        setIsOpen((prevIsOpen) => {
            return !prevIsOpen
        })
    }

    return (
        <div className={styles.headerItemsContainer}>
            <div>
                <span>Contact </span>
                <ContactSupportLink
                    alternateText={stringConstants.MAIL_TO_SUPPORT}
                />
            </div>
            <span aria-hidden className={styles.divider}>
                |
            </span>
            <nav className={`${styles.primaryNav}`}>
                <ul className={'usa-nav__primary usa-accordion'}>
                    {!isStateUser && (
                        <>
                            <li className={`usa-nav__primary-item`}>
                                <NavLinkWithLogging
                                    to={'/mc-review-settings'}
                                    variant="unstyled"
                                >
                                    MC-Review settings
                                </NavLinkWithLogging>
                            </li>
                            <li aria-hidden className={`usa-nav__primary-item`}>
                                <span aria-hidden className={styles.divider}>
                                    |
                                </span>
                            </li>
                        </>
                    )}
                    <li
                        className={`usa-nav__primary-item ${styles.subMenuContainer}`}
                    >
                        <>
                            <NavDropDownButton
                                key="testItemOne"
                                label="Your account"
                                menuId="accountDropDown"
                                className={styles.headerSignOutButton}
                                isOpen={isOpen}
                                onToggle={(): void => {
                                    onToggle()
                                }}
                            />
                            <Menu
                                key="one"
                                items={[
                                    <span key="email">{user.email}</span>,
                                    <ButtonWithLogging
                                        type="button"
                                        unstyled
                                        parent_component_type="constant header"
                                        onClick={logout}
                                        className={styles.signOutButton}
                                    >
                                        Sign out
                                    </ButtonWithLogging>,
                                ]}
                                isOpen={isOpen}
                                id="accountDropDown"
                            />
                        </>
                    </li>
                </ul>
            </nav>
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
