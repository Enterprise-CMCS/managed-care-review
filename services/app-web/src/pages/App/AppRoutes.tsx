import React, { useEffect, useState } from 'react'
import { Switch, Route } from 'react-router-dom'
import { useLocation, useHistory } from 'react-router'

import { CognitoLogin } from '../Auth/CognitoLogin'
import { LocalLogin } from '../../local'
import { Error404 } from '../Errors/Error404'
import { useAuth } from '../../contexts/AuthContext'
import { Dashboard } from '../Dashboard/Dashboard'
import { CMSDashboard } from '../Dashboard/CMSDashboard'
import { Landing } from '../Landing/Landing'
import { RoutesRecord } from '../../constants/routes'
import { StateSubmissionForm } from '../StateSubmission'
import { NewStateSubmissionForm } from '../StateSubmission'
import { SubmissionSummary } from '../SubmissionSummary'
import { idmRedirectURL } from '../../pages/Auth/cognitoAuth'
import { Help } from '../Help/Help'
import { useTitle } from '../../hooks/useTitle'
import { getRouteName, PageTitlesRecord, RouteT } from '../../constants/routes'
import { usePage } from '../../contexts/PageContext'
import { AuthModeType, assertNever } from '../../common-code/domain-models'

const LOGIN_REDIRECT_STORAGE_KEY = 'LOGIN_REDIRECT'
const LocalStorage = window.localStorage

function componentForAuthMode(
    authMode: AuthModeType
): (() => React.ReactElement) | undefined {
    switch (authMode) {
        case 'LOCAL':
            return LocalLogin
        case 'AWS_COGNITO':
            return CognitoLogin
        case 'IDM':
            return undefined
        default:
            assertNever(authMode)
    }
}

const StateUserRoutes = (): React.ReactElement => {
    return (
        <Switch>
            <Route path={RoutesRecord.ROOT} exact component={Dashboard} />
            <Route path={RoutesRecord.DASHBOARD} component={Dashboard} />
            <Route
                path={RoutesRecord.SUBMISSIONS_NEW}
                component={NewStateSubmissionForm}
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={SubmissionSummary}
                exact
            />
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={StateSubmissionForm}
            />
            <Route path={RoutesRecord.HELP} component={Help} />
            <Route path="*" component={Error404} />
        </Switch>
    )
}

const CMSUserRoutes = (): React.ReactElement => {
    return (
        <Switch>
            <Route path={RoutesRecord.ROOT} exact component={CMSDashboard} />
            <Route path={RoutesRecord.DASHBOARD} component={CMSDashboard} />
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={SubmissionSummary}
            />
            <Route path="*" component={Error404} />
        </Switch>
    )
}

const UnauthenticatedRoutes = ({
    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement => {
    const authComponent = componentForAuthMode(authMode)

    return (
        <Switch>
            <Route path={RoutesRecord.ROOT} exact component={Landing} />
            {/* no /auth page for IDM auth, we just have the login redirect link */}
            {authComponent && (
                <Route path={RoutesRecord.AUTH} component={authComponent} />
            )}
            <Route path="*" component={Landing} />
        </Switch>
    )
}

export const AppRoutes = ({
    authMode,
}: {
    authMode: AuthModeType
}): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const history = useHistory()
    const route = getRouteName(pathname)
    const { updateHeading } = usePage()
    const [initialPath] = useState(pathname) // this gets written on mount, so we don't call the effect on every path change

    // This effect handles our initial redirect on login
    // This way, if you get a link to something and aren't logged in, you get
    // sent there after you login.
    useEffect(() => {
        // When AppRoutes mounts and we are logged out, stash the url we navigated to in local storage
        // and redirect them to auth if they aren't heading for the dashboard.
        const dontRedirectToAuthRoutes: (RouteT | 'UNKNOWN_ROUTE')[] = [
            'ROOT' as const,
            'AUTH' as const,
            'UNKNOWN_ROUTE' as const,
        ]
        if (!loggedInUser) {
            const currentRoute = getRouteName(initialPath)
            console.log('ROUTE NAME', currentRoute, dontRedirectToAuthRoutes)
            if (!dontRedirectToAuthRoutes.includes(currentRoute)) {
                try {
                    console.log('Storing For Redirect: ', initialPath)
                    LocalStorage.setItem(
                        LOGIN_REDIRECT_STORAGE_KEY,
                        initialPath
                    )

                    if (authMode === 'IDM') {
                        console.log('redirecting to', idmRedirectURL())
                        window.location.href = idmRedirectURL()
                    } else {
                        console.log('redirecting to /auth')
                        history.push('/auth')
                    }
                } catch (err) {
                    console.log(
                        'Error: Local Storage is Full Attempting to Save Redirect URL'
                    )
                }
            }
            // Then, when we login, read that key, if it exists, go forth.
        } else {
            const redirectPath = LocalStorage.getItem(
                LOGIN_REDIRECT_STORAGE_KEY
            )
            console.log('Retrieved For Redirect: ', redirectPath)

            if (redirectPath) {
                history.push(redirectPath)
                LocalStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY)
            }
        }
    }, [initialPath, loggedInUser, history, authMode])

    /*
        Add page titles and headings throughout the application
    */
    const title =
        route === 'ROOT' && loggedInUser
            ? PageTitlesRecord['DASHBOARD']
            : PageTitlesRecord[route]
    useTitle(title)

    useEffect(() => {
        updateHeading(pathname)
    }, [pathname, updateHeading])

    if (!loggedInUser) {
        return <UnauthenticatedRoutes authMode={authMode} />
    } else if (loggedInUser.__typename === 'StateUser') {
        return <StateUserRoutes />
    } else {
        return <CMSUserRoutes />
    }
}
