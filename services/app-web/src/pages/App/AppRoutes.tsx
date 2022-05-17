import { useEffect, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Route, Switch } from 'react-router-dom'
import { extendSession } from '../../pages/Auth/cognitoAuth'
import { assertNever, AuthModeType } from '../../common-code/config'
import { dayjs } from '../../common-code/dateHelpers/dayjs'
import {
    getRouteName,
    PageTitlesRecord,
    RoutesRecord,
    RouteT,
} from '../../constants/routes'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { useTitle } from '../../hooks/useTitle'
import { LocalLogin } from '../../localAuth'
import { idmRedirectURL } from '../../pages/Auth/cognitoAuth'
import { CognitoLogin } from '../Auth/CognitoLogin'
import { CMSDashboard } from '../Dashboard/CMSDashboard'
import { Dashboard } from '../Dashboard/Dashboard'
import { AuthenticatedRouteWrapper } from '../Wrapper/AuthenticatedRouteWrapper'
import { Error404 } from '../Errors/Error404'
import { Help } from '../Help/Help'
import { Landing } from '../Landing/Landing'
import { NewStateSubmissionForm, StateSubmissionForm } from '../StateSubmission'
import { SubmissionSummary } from '../SubmissionSummary'
import { SubmissionRevisionSummary } from '../SubmissionRevisionSummary'
import { useScrollToPageTop } from '../../hooks/useScrollToPageTop'
import React from 'react'

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

const StateUserRoutes = ({
    setAlert,
}: {
    setAlert?: React.Dispatch<React.ReactElement>
}): React.ReactElement => {
    return (
        <AuthenticatedRouteWrapper setAlert={setAlert}>
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
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    component={SubmissionRevisionSummary}
                    exact
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={StateSubmissionForm}
                />
                <Route path={RoutesRecord.HELP} component={Help} />
                <Route path="*" component={Error404} />
            </Switch>
        </AuthenticatedRouteWrapper>
    )
}

const CMSUserRoutes = ({
    setAlert,
}: {
    setAlert?: React.Dispatch<React.ReactElement>
}): React.ReactElement => {
    return (
        <AuthenticatedRouteWrapper setAlert={setAlert}>
            <Switch>
                <Route
                    path={RoutesRecord.ROOT}
                    exact
                    component={CMSDashboard}
                />
                <Route path={RoutesRecord.DASHBOARD} component={CMSDashboard} />
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                    exact
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    component={SubmissionRevisionSummary}
                    exact
                />
                <Route path="*" component={Error404} />
            </Switch>
        </AuthenticatedRouteWrapper>
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
    setAlert,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
}): React.ReactElement => {
    const { loggedInUser, isSessionExpiring, updateSessionExpiry } = useAuth()
    const { pathname } = useLocation()
    const history = useHistory()
    const route = getRouteName(pathname)
    const { updateHeading } = usePage()
    const [initialPath] = useState(pathname) // this gets written on mount, so we don't call the effect on every path change
    const runningTimers = useRef<NodeJS.Timer[]>([])
    // when we load, set the logout timer for 30 minutes in the future and refresh the session
    let sessionExpirationTime: dayjs.Dayjs | undefined = undefined
    console.log('logged in user: ', loggedInUser)
    if (!loggedInUser) {
        LocalStorage.removeItem('LOGOUT_TIMER')
    }
    if (loggedInUser && !isSessionExpiring) {
        sessionExpirationTime = dayjs(Date.now()).add(2, 'minute')
        try {
            LocalStorage.setItem(
                'LOGOUT_TIMER',
                sessionExpirationTime.toISOString()
            )
        } catch (e) {
            console.log('Error setting logout timer: ', e)
        }
        try {
            void extendSession()
        } catch (e) {
            console.log('Error refreshing session: ', e)
        }
        updateSessionExpiry(false)
        const timer = setInterval(() => {
            runningTimers.current.push(timer)
            // is the current time within 2 minutes of the session expiration time?
            let insideTwoMinuteWindow = false
            if (sessionExpirationTime) {
                insideTwoMinuteWindow = dayjs(Date.now()).isAfter(
                    dayjs(sessionExpirationTime).subtract(1, 'minute')
                )
            }
            if (insideTwoMinuteWindow) {
                /* if the session is about to expire, but we haven't set that piece of state yet
                we set it here and clear the timers, because we don't need a countdown anymore once we've 
                entered the expiry window */
                console.log('about to clear: ', runningTimers.current)
                runningTimers.current.forEach((t) => clearInterval(t))
                runningTimers.current = []
                console.log('cleared: ', runningTimers.current)
                updateSessionExpiry(true)
            }
        }, 1000 * 30)
    }

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
        Side effects that happen on page change
    */
    const title =
        route === 'ROOT' && loggedInUser
            ? PageTitlesRecord['DASHBOARD']
            : PageTitlesRecord[route]

    useTitle(title)
    useScrollToPageTop()
    useEffect(() => {
        updateHeading(pathname)
    }, [pathname, updateHeading])

    if (!loggedInUser) {
        return <UnauthenticatedRoutes authMode={authMode} />
    } else if (loggedInUser.__typename === 'StateUser') {
        return <StateUserRoutes setAlert={setAlert} />
    } else {
        return <CMSUserRoutes setAlert={setAlert} />
    }
}
