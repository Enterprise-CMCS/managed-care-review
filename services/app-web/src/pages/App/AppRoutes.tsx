import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { extendSession } from '../../pages/Auth/cognitoAuth'
import { assertNever, AuthModeType } from '../../common-code/config'
import { PageTitlesRecord, RoutesRecord, RouteT } from '../../constants/routes'
import { getRouteName } from '../../routeHelpers'
import { useAuth } from '../../contexts/AuthContext'
import { useOTEL } from '../../hooks/useOTEL'
import { usePage } from '../../contexts/PageContext'
import { useTitle } from '../../hooks/useTitle'
import { LocalLogin } from '../../localAuth'
import { idmRedirectURL } from '../../pages/Auth/cognitoAuth'
import { CognitoLogin } from '../Auth/CognitoLogin'
import { CMSDashboard } from '../CMSDashboard/CMSDashboard'
import { StateDashboard } from '../StateDashboard/StateDashboard'
import { AuthenticatedRouteWrapper } from '../Wrapper/AuthenticatedRouteWrapper'
import { Error404 } from '../Errors/Error404'
import { Help } from '../Help/Help'
import { Landing } from '../Landing/Landing'
import { NewStateSubmissionForm, StateSubmissionForm } from '../StateSubmission'
import { SubmissionSummary } from '../SubmissionSummary'
import { SubmissionRevisionSummary } from '../SubmissionRevisionSummary'
import { useScrollToPageTop } from '../../hooks/useScrollToPageTop'
import { featureFlags } from '../../common-code/featureFlags'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { recordJSException } from '../../otelHelpers'

function componentForAuthMode(
    authMode: AuthModeType
): React.ReactElement | undefined {
    switch (authMode) {
        case 'LOCAL':
            return <LocalLogin />
        case 'AWS_COGNITO':
            return <CognitoLogin />
        case 'IDM':
            return undefined
        default:
            assertNever(authMode)
    }
}

const StateUserRoutes = ({
    authMode,
    setAlert,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
}): React.ReactElement => {
    return (
        <AuthenticatedRouteWrapper setAlert={setAlert} authMode={authMode}>
            <Routes>
                <Route path={RoutesRecord.ROOT} element={<StateDashboard />} />
                <Route
                    path={RoutesRecord.DASHBOARD}
                    element={<StateDashboard />}
                />
                <Route path={RoutesRecord.HELP} element={<Help />} />
                <Route
                    path={RoutesRecord.SUBMISSIONS}
                    element={<StateDashboard />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW}
                    element={<NewStateSubmissionForm />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                    element={<SubmissionSummary />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummary />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    element={<StateSubmissionForm />}
                />
                <Route path="*" element={<Error404 />} />
            </Routes>
        </AuthenticatedRouteWrapper>
    )
}

const CMSUserRoutes = ({
    authMode,
    setAlert,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
}): React.ReactElement => {
    return (
        <AuthenticatedRouteWrapper authMode={authMode} setAlert={setAlert}>
            <Routes>
                <Route path={RoutesRecord.ROOT} element={<CMSDashboard />} />
                <Route
                    path={RoutesRecord.DASHBOARD}
                    element={<CMSDashboard />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_SUMMARY}
                    element={<SubmissionSummary />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummary />}
                />
                <Route path="*" element={<Error404 />} />
            </Routes>
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
        <Routes>
            <Route path={RoutesRecord.ROOT} element={<Landing />} />
            {/* no /auth page for IDM auth, we just have the login redirect link */}
            {authComponent && (
                <Route path={RoutesRecord.AUTH} element={authComponent} />
            )}
            <Route path="*" element={<Landing />} />
        </Routes>
    )
}

export const AppRoutes = ({
    authMode,
    setAlert,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
}): React.ReactElement => {
    const {
        loggedInUser,
        sessionIsExpiring,
        updateSessionExpirationState,
        updateSessionExpirationTime,
        checkIfSessionsIsAboutToExpire,
    } = useAuth()
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const ldClient = useLDClient()
    const [redirectPath, setRedirectPath] = useLocalStorage(
        'LOGIN_REDIRECT',
        null
    )
    const showExpirationModal: boolean = ldClient?.variation(
        featureFlags.SESSION_EXPIRING_MODAL,
        true
    )
    const route = getRouteName(pathname)
    const { updateHeading } = usePage()
    const [initialPath] = useState(pathname) // this gets written on mount, so we don't call the effect on every path change
    if (
        loggedInUser !== undefined &&
        sessionIsExpiring === false &&
        showExpirationModal
    ) {
        // whenever we load a page, reset the logout timer and refresh the session
        updateSessionExpirationTime()

        if (authMode !== 'LOCAL') {
            void extendSession()
        }
        updateSessionExpirationState(false)
        // Every thirty seconds, check if the current time is within `countdownDuration` of the session expiration time
        checkIfSessionsIsAboutToExpire()
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
            if (!dontRedirectToAuthRoutes.includes(currentRoute)) {
                try {
                    if (redirectPath !== initialPath) {
                        setRedirectPath(initialPath)
                    }
                    if (authMode === 'IDM') {
                        console.log('redirecting to', idmRedirectURL())
                        window.location.href = idmRedirectURL()
                    } else {
                        console.log('redirecting to /auth')
                        navigate('/auth')
                    }
                } catch (err) {
                    recordJSException(
                        `Error attempting to save login redirect URL. Error message: ${err}`
                    )
                }
            }
            // Then, when we login, read that key, if it exists, go forth.
        } else {
            console.log('Retrieved For Redirect: ', redirectPath)

            if (typeof redirectPath === 'string') {
                navigate(redirectPath)
                setRedirectPath(null)
            }
        }
    }, [
        initialPath,
        loggedInUser,
        navigate,
        authMode,
        redirectPath,
        setRedirectPath,
    ])

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
        updateHeading({})
    }, [pathname, updateHeading])
    useOTEL()

    if (!loggedInUser) {
        return <UnauthenticatedRoutes authMode={authMode} />
    } else if (loggedInUser.__typename === 'StateUser') {
        return <StateUserRoutes authMode={authMode} setAlert={setAlert} />
    } else {
        return <CMSUserRoutes authMode={authMode} setAlert={setAlert} />
    }
}
