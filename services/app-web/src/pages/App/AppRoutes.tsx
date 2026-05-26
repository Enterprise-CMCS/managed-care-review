import React, { useEffect, useLayoutEffect, useState } from 'react'
import {
    Route,
    Routes,
    useLocation,
    Navigate,
    useParams,
} from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { idmRedirectURL } from '../Auth/cognitoAuth'
import { assertNever, AuthModeType } from '@mc-review/common-code'
import { PageTitlesRecord, RoutesRecord, RouteT } from '@mc-review/constants'
import { getRouteName } from '../../routeHelpers'
import { useAuth } from '../../contexts/AuthContext'
import { usePage } from '../../contexts/PageContext'
import { useTitle } from '../../hooks'
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
import { ContactUs } from '../ContactUs/ContactUs'
import { Training } from '../Resources/Training'
import { ResourcesSideNav } from '../Resources/ResourcesSideNav'
import { Landing } from '../Landing/Landing'
import { MccrsId } from '../MccrsId/MccrsId'
import {
    NewStateSubmissionForm,
    StateSubmissionForm,
    NewSubmission,
    NewSubmissionForm,
} from '../StateSubmission'
import { SubmissionSummaryRoutes } from '../SubmissionSummary'
import { RevisionSummaryRoutes } from '../SubmissionRevisionSummary'
import { useScrollToPageTop } from '../../hooks'
import { featureFlags } from '@mc-review/common-code'
import { useLocalStorage } from '../../hooks'
import { recordJSException } from '@mc-review/otel'
import { SubmissionSideNav } from '../SubmissionSideNav'
import {
    ContractQuestionResponse,
    UploadContractResponse,
    DeleteContractQuestion,
} from '../QuestionResponse'
import { GraphQLExplorer } from '../GraphQLExplorer/GraphQLExplorer'
import { RateSummary } from '../RateSummary'
import { RateEdit } from '../RateEdit/RateEdit'
import {
    StateAssignmentTable,
    AutomatedEmailsTable,
    SupportEmailsTable,
    DivisionAssignmentTable,
    OauthClients,
} from '../Settings/SettingsTables'
import { EditStateAssign } from '../Settings/EditStateAssign/EditStateAssign'
import {
    UploadContractQuestions,
    UploadRateQuestions,
} from '../QuestionResponse'
import { RateSummarySideNav } from '../SubmissionSideNav/RateSummarySideNav'
import { RateQuestionResponse } from '../QuestionResponse'
import { UploadRateResponse } from '../QuestionResponse'
import { ReleasedToState } from '../SubmissionReleasedToState/ReleasedToState'
import { RateWithdraw } from '../RateWithdraw/RateWithdraw'
import { UndoRateWithdraw } from '../UndoRateWithdraw/UndoRateWithdraw'
import { SubmissionWithdraw } from '../SubmissionWithdraw/SubmissionWithdraw'
import { UndoSubmissionWithdraw } from '../UndoSubmissionWithdraw/UndoSubmissionWithdraw'
import { UndoSubmissionUnlock } from '../UndoSubmissionUnlock/UndoSubmissionUnlock'
import { CreateOauthClient } from '../Settings/Oauth/CreateOauthClient'
import { User } from '../../gen/gqlClient'
import { AddLocalUser } from '../../localAuth/AddLocalUser'

const CMSUploadQuestionsRoute = ({
    loggedInUser,
    children,
}: {
    loggedInUser: User
    children: React.ReactElement
}): React.ReactElement => {
    const { division } = useParams<{ division: string }>()
    const userDivision =
        loggedInUser.__typename === 'CMSUser' ||
        loggedInUser.__typename === 'CMSApproverUser'
            ? loggedInUser.divisionAssignment
            : undefined

    const canAccessUploadQuestionsRoute =
        userDivision === 'DMCO' && division?.toUpperCase() === userDivision

    return canAccessUploadQuestionsRoute ? children : <Error404 />
}

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
// Hide "Contact us" and "Resources and Training" pages behind the feature flag
const renderUniversalRoutes = (showResourcesNavPages: boolean) => (
    <>
        <Route
            path={RoutesRecord.CONTACT_US}
            element={showResourcesNavPages ? <ContactUs /> : <Error404 />}
        />
        <Route
            path="/help"
            element={<Navigate to={RoutesRecord.HELP} replace />}
        />
        <Route
            path="/training"
            element={
                showResourcesNavPages ? (
                    <Navigate to={RoutesRecord.RESOURCES_TRAINING} replace />
                ) : (
                    <Error404 />
                )
            }
        />
        <Route
            path={RoutesRecord.RESOURCES}
            element={<ResourcesSideNav showSideNav={showResourcesNavPages} />}
        >
            <Route
                index
                element={<Navigate to={RoutesRecord.HELP} replace />}
            />
            <Route path="help" element={<Help />} />
            <Route
                path="training"
                element={showResourcesNavPages ? <Training /> : <Error404 />}
            />
        </Route>
    </>
)

const StateUserRoutes = ({
    stageName,
    showResourcesNavPages,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
    stageName?: string
    showResourcesNavPages: boolean
}): React.ReactElement => {
    // feature flag
    const ldClient = useLDClient()
    const showRatePages: boolean = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )
    const showEqroSubmissions: boolean = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )
    const showSdpSubmissions: boolean = ldClient?.variation(
        featureFlags.SDP.flag,
        featureFlags.SDP.defaultValue
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
                {showEqroSubmissions || showSdpSubmissions ? (
                    <>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_NEW}
                            element={<NewSubmission />}
                        />
                        <Route
                            path={RoutesRecord.SUBMISSIONS_NEW_SUBMISSION_FORM}
                            element={<NewSubmissionForm />}
                        />
                    </>
                ) : (
                    <Route
                        path={RoutesRecord.SUBMISSIONS_NEW}
                        element={<NewStateSubmissionForm />}
                    />
                )}
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
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<ContractQuestionResponse />}
                    />
                    <Route
                        element={<UploadContractResponse />}
                        path={RoutesRecord.SUBMISSIONS_UPLOAD_CONTRACT_RESPONSE}
                    />

                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={
                            <SubmissionSummaryRoutes
                                showEqroSubmissions={showEqroSubmissions}
                            />
                        }
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                        element={<StateSubmissionForm />}
                    />
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
                        }
                        element={<RateQuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_UPLOAD_RATE_RESPONSE}
                        element={<UploadRateResponse />}
                    />
                </Route>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={
                        <RevisionSummaryRoutes
                            showEqroSubmissions={showEqroSubmissions}
                        />
                    }
                />
                {renderUniversalRoutes(showResourcesNavPages)}
                {isExplorerAllowed(stageName) && (
                    <Route
                        path={RoutesRecord.GRAPHQL_EXPLORER}
                        element={<GraphQLExplorer />}
                    />
                )}
                <Route path="*" element={<Error404 />} />
            </Routes>
        </AuthenticatedRouteWrapper>
    )
}

const CMSUserRoutes = ({
    stageName,
    loggedInUser,
    showResourcesNavPages,
}: {
    authMode: AuthModeType
    setAlert?: React.Dispatch<React.ReactElement>
    stageName?: string
    loggedInUser: User
    showResourcesNavPages: boolean
}): React.ReactElement => {
    // feature flag
    const ldClient = useLDClient()
    const showUndoWithdrawRate: boolean = ldClient?.variation(
        featureFlags.UNDO_WITHDRAW_RATE.flag,
        featureFlags.UNDO_WITHDRAW_RATE.defaultValue
    )
    const showWithdrawSubmission: boolean = ldClient?.variation(
        featureFlags.WITHDRAW_SUBMISSION.flag,
        featureFlags.WITHDRAW_SUBMISSION.defaultValue
    )
    const showUndoWithdrawSubmission: boolean = ldClient?.variation(
        featureFlags.UNDO_WITHDRAW_SUBMISSION.flag,
        featureFlags.UNDO_WITHDRAW_SUBMISSION.defaultValue
    )
    const showEqroSubmissions: boolean = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )

    const isAdminUser = loggedInUser.__typename === 'AdminUser'

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
                        path={
                            RoutesRecord.SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS
                        }
                        element={<ContractQuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.SUBMISSIONS_UPLOAD_CONTRACT_QUESTION}
                        element={
                            <CMSUploadQuestionsRoute
                                loggedInUser={loggedInUser}
                            >
                                <UploadContractQuestions />
                            </CMSUploadQuestionsRoute>
                        }
                    />
                    {isAdminUser && (
                        <Route
                            path={
                                RoutesRecord.SUBMISSIONS_DELETE_CONTRACT_QUESTION
                            }
                            element={<DeleteContractQuestion />}
                        />
                    )}
                    <Route
                        path={RoutesRecord.SUBMISSIONS_SUMMARY}
                        element={
                            <SubmissionSummaryRoutes
                                showEqroSubmissions={showEqroSubmissions}
                            />
                        }
                    />
                </Route>

                <Route element={<RateSummarySideNav />}>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                    <Route
                        path={RoutesRecord.RATES_SUMMARY_QUESTIONS_AND_ANSWERS}
                        element={<RateQuestionResponse />}
                    />
                    <Route
                        path={RoutesRecord.RATES_UPLOAD_QUESTION}
                        element={
                            <CMSUploadQuestionsRoute
                                loggedInUser={loggedInUser}
                            >
                                <UploadRateQuestions />
                            </CMSUploadQuestionsRoute>
                        }
                    />
                    {/*This route will cause the RateSummarySideNav to redirect to rate summary Q&A page*/}
                    <Route
                        path={
                            RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS
                        }
                    />
                </Route>

                <Route
                    path={RoutesRecord.SUBMISSIONS_MCCRSID}
                    element={<MccrsId />}
                />

                <Route
                    path={RoutesRecord.SUBMISSIONS_RELEASED_TO_STATE}
                    element={<ReleasedToState />}
                />

                {showWithdrawSubmission && (
                    <Route
                        path={RoutesRecord.SUBMISSION_WITHDRAW}
                        element={<SubmissionWithdraw />}
                    />
                )}

                {showUndoWithdrawSubmission && (
                    <Route
                        path={RoutesRecord.UNDO_SUBMISSION_WITHDRAW}
                        element={<UndoSubmissionWithdraw />}
                    />
                )}

                {isAdminUser && (
                    <Route
                        path={RoutesRecord.UNDO_SUBMISSION_UNLOCK}
                        element={<UndoSubmissionUnlock />}
                    />
                )}

                <Route
                    path={RoutesRecord.RATE_WITHDRAW}
                    element={<RateWithdraw />}
                />

                {showUndoWithdrawRate && (
                    <Route
                        path={RoutesRecord.UNDO_RATE_WITHDRAW}
                        element={<UndoRateWithdraw />}
                    />
                )}

                <Route
                    path={RoutesRecord.SUBMISSIONS_REVISION}
                    element={
                        <RevisionSummaryRoutes
                            showEqroSubmissions={showEqroSubmissions}
                        />
                    }
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
                    {isAdminUser && (
                        //For Admin user only routes.
                        <>
                            <Route
                                path={RoutesRecord.OAUTH_CLIENTS}
                                element={<OauthClients />}
                            />
                            <Route
                                path={RoutesRecord.CREATE_OAUTH_CLIENT}
                                element={<CreateOauthClient />}
                            />
                        </>
                    )}
                </Route>
                <Route
                    path={RoutesRecord.SETTINGS}
                    // Until we update the helpdesk documentation for the /mc-review-settings route, we are keeping this
                    // one and just redirecting.
                    element={<Navigate to="/mc-review-settings" />}
                />
                {renderUniversalRoutes(showResourcesNavPages)}
                <Route path="*" element={<Error404 />} />
            </Routes>
        </AuthenticatedRouteWrapper>
    )
}

const UnauthenticatedRoutes = ({
    authMode,
    showResourcesNavPages,
}: {
    authMode: AuthModeType
    showResourcesNavPages: boolean
}): React.ReactElement => {
    const authComponent = componentForAuthMode(authMode)

    return (
        <Routes>
            <Route path={RoutesRecord.ROOT} element={<Landing />} />
            {renderUniversalRoutes(showResourcesNavPages)}
            {/* no /auth page for IDM auth, we just have the login redirect link */}
            {authComponent && (
                <Route path={RoutesRecord.AUTH} element={authComponent} />
            )}
            {authMode === 'LOCAL' && (
                <Route
                    path={'/add-new-local-user'}
                    element={<AddLocalUser />}
                />
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
    // feature flag to hide Contact us and Resources pages
    const ldClient = useLDClient()
    const showResourcesNavPages: boolean = ldClient?.variation(
        featureFlags.RESOURCES_NAV_PAGES.flag,
        featureFlags.RESOURCES_NAV_PAGES.defaultValue
    )

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
            'CONTACT_US' as const,
            'RESOURCES' as const,
            'RESOURCES_TRAINING' as const,
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
    useLayoutEffect(() => {
        updateHeading({})
    }, [pathname, updateHeading])

    if (!loggedInUser) {
        return (
            <UnauthenticatedRoutes
                authMode={authMode}
                showResourcesNavPages={showResourcesNavPages}
            />
        )
    } else if (loggedInUser.__typename === 'StateUser') {
        return (
            <StateUserRoutes
                authMode={authMode}
                setAlert={setAlert}
                stageName={stageName}
                showResourcesNavPages={showResourcesNavPages}
            />
        )
    } else {
        return (
            <CMSUserRoutes
                authMode={authMode}
                setAlert={setAlert}
                stageName={stageName}
                loggedInUser={loggedInUser}
                showResourcesNavPages={showResourcesNavPages}
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
