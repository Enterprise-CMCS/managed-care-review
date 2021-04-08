import React from 'react'
import {
    Alert,
    Button,
    Link,
    GridContainer,
    Grid,
} from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'

import { idmRedirectURL } from '../../pages/Auth/cognitoAuth'
import medicaidLogo from '../../assets/images/medicaidgovlogo.png'
import styles from './Header.module.scss'
import { useHistory } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { AuthModeType } from '../../common-code/domain-models'
import { Logo } from '../Logo/Logo'
import { PageHeadingRow } from './PageHeadingRow'
import { User } from '../../gen/gqlClient'
import { PageHeadingsRecord, getRouteName } from '../../constants/routes'

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
    const routeName = getRouteName(history.location.pathname)
    const { heading } = usePage()

    /*
        Dynamically calculate heading in priority order
        1. If there a constant heading set up, use that
        2. Otherwise, use whatever is in the PageContext
        3. Fallback in case of new route
    */

    const pageHeadingText =
        routeName !== 'UNKNOWN_ROUTE' &&
        Object.prototype.hasOwnProperty.call(PageHeadingsRecord, routeName)
            ? PageHeadingsRecord[routeName]
            : heading
            ? heading
            : 'Managed Care Review' // fallback for safety

    const handleLogout = (
        e: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        if (!logout) {
            console.log('Something went wrong ', e)
            return
        }

        logout().catch(() => {
            // TODO: Add site wide alert
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
            <PageHeadingRow
                heading={pageHeadingText}
                isLoading={loginStatus === 'LOADING'}
                loggedInUser={loggedInUser}
            />
        </header>
    )
}
