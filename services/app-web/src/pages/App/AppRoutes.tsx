import React, { Fragment, useEffect, useState } from 'react'
import { useLocation, Navigate } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { idmRedirectURL } from '../../pages/Auth/cognitoAuth'
import { assertNever, AuthModeType } from '../../common-code/config'
import { PageTitlesRecord, RoutesRecord, RouteT } from '../../constants/routes'
import { getRouteName } from '../../routeHelpers'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { useTitle } from '../../hooks/useTitle'
import { LocalLogin } from '../../localAuth'
import { CognitoLogin } from '../Auth/CognitoLogin'
import {
    CMSDashboard,
    SubmissionsDashboard,
    RateReviewsDashboard,
} from '../CMSDashboard'
import { StateDashboard } from '../StateDashboard/StateDashboard'
import { Settings } from '../Settings/Settings'
import { AuthenticatedRouteWrapper } from '../Wrapper/AuthenticatedRouteWrapper'
import { Error404 } from '../Errors/Error404Page'
import { Help } from '../Help/Help'
import { Landing } from '../Landing/Landing'
import { MccrsId } from '../MccrsId/MccrsId'
import { NewStateSubmissionForm, StateSubmissionForm } from '../StateSubmission'
import { SubmissionSummary } from '../SubmissionSummary'
import { SubmissionRevisionSummary } from '../SubmissionRevisionSummary'
import { useScrollToPageTop } from '../../hooks/useScrollToPageTop'
import { featureFlags } from '../../common-code/featureFlags'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { recordJSException } from '../../otelHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import {
    QuestionResponse,
    UploadContractResponse,
} from '../QuestionResponse'
import { GraphQLExplorer } from '../GraphQLExplorer/GraphQLExplorer'
import { RateSummary } from '../RateSummary'
import { ReplaceRate } from '../ReplaceRate/ReplaceRate'
import { RateEdit } from '../RateEdit/RateEdit'
import { APIAccess } from '../APIAccess/APIAccess'
import {
    StateAssignmentTable,
    AutomatedEmailsTable,
    SupportEmailsTable,
    DivisionAssignmentTable,
} from '../Settings/SettingsTables'
import { EditStateAssign } from '../Settings/EditStateAssign/EditStateAssign'
import { UploadContractQuestions, UploadRateQuestions } from '../QuestionResponse/UploadQuestions'
import { RateSummarySideNav } from '../SubmissionSideNav/RateSummarySideNav'
import { RateQuestionResponse } from '../QuestionResponse/RateQuestionResponse'
import { UploadRateResponse } from '../QuestionResponse/UploadResponse/UploadRateResponse'

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

// Routes that are agnostic to user login and authentication
// Should be available on all defined routes lists
const UniversalRoutes = (
    <Fragment>
        <Route path={RoutesRecord.HELP} element={<Help />} />
    </Fragment>
)

const StateUserRoutes = ({
    stageName,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
    stageName?: string
}): React.ReactElement => {
    // feature flag
    const ldClient = useLDClient()
    const showRatePages: boolean = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )

    const showQAbyRates: boolean = ldClient?.variation(
        featureFlags.QA_BY_RATES.flag,
        featureFlags.QA_BY_RATES.defaultValue
    )

    return (
        <AuthenticatedRouteWrapper>
            <Routes>
                <Route
                    path={RoutesRecord.ROOT}
                    element={
                        <Navigate to={RoutesRecord.DASHBOARD_SUBMISSIONS} />
                    }
                />
                <Route
                    path={RoutesRecord.DASHBOARD}
                    element={
                        <Navigate to={RoutesRecord.DASHBOARD_SUBMISSIONS} />
                    }
                />
                <Route
                    path={RoutesRecord.DASHBOARD_SUBMISSIONS}
                    element={<StateDashboard />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS}
                    element={<StateDashboard />}
                />
                <Route
                    path={RoutesRecord.SUBMISSIONS_NEW}
                    element={<NewStateSubmissionForm />}
                />
                {showRatePages && (
                    <>
                        <Route
                            path={RoutesRecord.RATES_SUMMARY}
                            element={<RateSummary />}
                        />
                        <Route
                            path={RoutesRecord.RATE_EDIT}
                            element={<RateEdit />}
                        />
                    </>
                )}
                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                    <Route
                        element={<UploadContractResponse />}
                        path={RoutesRecord.SUBMISSIONS_UPLOAD_CONTRACT_RESPONSE}
                    />

                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                        element={<StateSubmissionForm />}
                    />
                    {showQAbyRates && (
                       <>
                       <Route
                            path={
                                RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
                            }
                            element={<RateQuestionResponse />}
                        />
                        <Route
                        path={
                            RoutesRecord.SUBMISSIONS_UPLOAD_RATE_RESPONSE
                        }
                        element={<UploadRateResponse />}
                        />
                    </>
                    )}
                </Route>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummary />}
                />
                {UniversalRoutes}
                {isExplorerAllowed(stageName) && (
                    <Route
                        path={RoutesRecord.GRAPHQL_EXPLORER}
                        element={<GraphQLExplorer />}
                    />
                )}
                <Route path={RoutesRecord.API_ACCESS} element={<APIAccess />} />
                <Route path="*" element={<Error404 />} />
            </Routes>
        </AuthenticatedRouteWrapper>
    )
}

const CMSUserRoutes = ({
    stageName,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
    stageName?: string
}): React.ReactElement => {
    const ldClient = useLDClient()
    const showQAbyRates: boolean = ldClient?.variation(
        featureFlags.QA_BY_RATES.flag,
        featureFlags.QA_BY_RATES.defaultValue
    )
    return (
        <AuthenticatedRouteWrapper>
            <Routes>
                <Route
                    path={RoutesRecord.ROOT}
                    element={
                        <Navigate to={RoutesRecord.DASHBOARD_SUBMISSIONS} />
                    }
                />
                <Route path={RoutesRecord.DASHBOARD} element={<CMSDashboard />}>
                    <Route
                        index
                        element={
                            <Navigate to={RoutesRecord.DASHBOARD_SUBMISSIONS} />
                        }
                    />
                    <Route
                        path={`submissions`}
                        element={<SubmissionsDashboard />}
                    />
                    <Route
                        path={'rate-reviews'}
                        element={<RateReviewsDashboard />}
                    />
                </Route>

                <Route element={<SubmissionSideNav />}>
                    <Route
                        path={RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS}
                        element={<QuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_UPLOAD_CONTRACT_QUESTION}
                        element={<UploadContractQuestions />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={<SubmissionSummary />}
                    />
                </Route>

                <Route
                    path={RoutesRecord.RATES_SUMMARY}
                    element={<RateSummary />}
                />
                {showQAbyRates ? (
                    <>
                        <Route element={<RateSummarySideNav />}>
                            <Route
                                path={RoutesRecord.RATES_SUMMARY}
                                element={<RateSummary />}
                            />
                            <Route
                                path={
                                    RoutesRecord.RATES_SUMMARY_QUESTIONS_AND_ANSWERS
                                }
                                element={<RateQuestionResponse />}
                            />
                            <Route
                                path={RoutesRecord.RATES_UPLOAD_QUESTION }
                                element={<UploadRateQuestions/>}
                                />
                            {/*This route will cause the RateSummarySideNav to redirect to rate summary Q&A page*/}
                            <Route
                                path={
                                    RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
                                }
                            />
                        </Route>
                    </>
                ) : (
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                )}

                <Route
                    path={RoutesRecord.SUBMISSIONS_MCCRSID}
                    element={<MccrsId />}
                />

                <Route
                    path={RoutesRecord.REPLACE_RATE}
                    element={<ReplaceRate />}
                />

                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={<SubmissionRevisionSummary />}
                />
                {isExplorerAllowed(stageName) && (
                    <Route
                        path={RoutesRecord.GRAPHQL_EXPLORER}
                        element={<GraphQLExplorer />}
                    />
                )}
                <Route path={RoutesRecord.MCR_SETTINGS} element={<Settings />}>
                    <Route
                        index
                        element={
                            <Navigate to={RoutesRecord.STATE_ASSIGNMENTS} />
                        }
                    />
                    <Route
                        path={RoutesRecord.STATE_ASSIGNMENTS}
                        element={<StateAssignmentTable />}
                    />
                    <Route
                        path={RoutesRecord.DIVISION_ASSIGNMENTS}
                        element={<DivisionAssignmentTable />}
                    />
                    <Route
                        path={RoutesRecord.AUTOMATED_EMAILS}
                        element={<AutomatedEmailsTable />}
                    />
                    <Route
                        path={RoutesRecord.SUPPORT_EMAILS}
                        element={<SupportEmailsTable />}
                    />
                    <Route
                        path={RoutesRecord.EDIT_STATE_ASSIGNMENTS}
                        element={<EditStateAssign />}
                    />
                </Route>
                <Route
                    path={RoutesRecord.SETTINGS}
                    // Until we update the helpdesk documentation for the /mc-review-settings route, we are keeping this
                    // one and just redirecting.
                    element={<Navigate to="/mc-review-settings" />}
                />
                <Route path={RoutesRecord.API_ACCESS} element={<APIAccess />} />
                {UniversalRoutes}
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
            {UniversalRoutes}
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
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const [redirectPath, setRedirectPath] = useLocalStorage(
        'LOGIN_REDIRECT',
        null
    )
    const stageName = import.meta.env.VITE_APP_STAGE_NAME

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
            'HELP' as const,
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
                        console.info('redirecting to', idmRedirectURL())
                        window.location.href = idmRedirectURL()
                    } else {
                        console.info('redirecting to /auth')
                        window.location.href = '/auth'
                    }
                } catch (err) {
                    recordJSException(
                        `Error attempting to save login redirect URL. Error message: ${err}`
                    )
                }
            }
            // Then, when we login, read that key, if it exists, go forth.
        } else {
            if (typeof redirectPath === 'string') {
                console.info('Retrieved For Redirect: ', redirectPath)
                window.location.href = redirectPath
                setRedirectPath(null)
            }
        }
    }, [initialPath, loggedInUser, authMode, redirectPath, setRedirectPath])

    /*
        Side effects that happen on page change
    */
    const title =
        route === 'ROOT' && loggedInUser
            ? PageTitlesRecord['DASHBOARD_SUBMISSIONS']
            : PageTitlesRecord[route]

    useTitle(title)
    useScrollToPageTop()
    useEffect(() => {
        updateHeading({})
    }, [pathname, updateHeading])

    if (!loggedInUser) {
        return <UnauthenticatedRoutes authMode={authMode} />
    } else if (loggedInUser.__typename === 'StateUser') {
        return (
            <StateUserRoutes
                authMode={authMode}
                setAlert={setAlert}
                stageName={stageName}
            />
        )
    } else {
        return (
            <CMSUserRoutes
                authMode={authMode}
                setAlert={setAlert}
                stageName={stageName}
            />
        )
    }
}

const isExplorerAllowed = (stage: string | undefined): boolean => {
    const RESTRICTED_STAGES = ['val', 'prod']
    if (stage === undefined) {
        return false
    }
    return !RESTRICTED_STAGES.includes(stage)
}
