import { Link, SideNav, GridContainer, Icon } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import styles from './SubmissionSideNav.module.scss'
import { useParams, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    QUESTION_RESPONSE_SHOW_SIDEBAR_ROUTES,
    RoutesRecord,
    STATE_SUBMISSION_FORM_ROUTES,
} from '../../constants/routes'
import { getRouteName } from '../../routeHelpers'
import { useFetchHealthPlanPackageWithQuestionsWrapper } from '../../gqlHelpers'
import { Loading } from '../../components'
import { ApolloError } from '@apollo/client'
import { handleApolloError } from '../../gqlHelpers/apolloErrors'
import { recordJSException } from '../../otelHelpers'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404Page'
import {
    HealthPlanPackage,
    HealthPlanRevision,
    User,
} from '../../gen/gqlClient'
import {
    HealthPlanFormDataType,
    packageName,
} from '../../common-code/healthPlanFormDataType'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'
import {
    DocumentDateLookupTableType,
    makeDocumentDateTable,
} from '../../documentHelpers/makeDocumentDateLookupTable'

export type SideNavOutletContextType = {
    pkg: HealthPlanPackage
    packageName: string
    currentRevision: HealthPlanRevision
    packageData: HealthPlanFormDataType
    documentDates: DocumentDateLookupTableType
    user: User
}

type RouteParams = {
    id: string
}

export const SubmissionSideNav = () => {
    const { id } = useParams<keyof RouteParams>()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const ldClient = useLDClient()

    const routeName = getRouteName(pathname)

    const showQuestionResponse = ldClient?.variation(
        featureFlags.CMS_QUESTIONS.flag,
        featureFlags.CMS_QUESTIONS.defaultValue
    )

    const isSelectedLink = (route: string | string[]): string => {
        //We pass an array of the form routes in order to display the sideNav on all of the pages
        if (typeof route != 'string') {
            return route.includes(routeName) ? 'usa-current' : ''
        } else {
            return routeName === route ? 'usa-current' : ''
        }
    }

    const { result: fetchResult } =
        useFetchHealthPlanPackageWithQuestionsWrapper(id)

    if (fetchResult.status === 'ERROR') {
        const err = fetchResult.error
        console.error('Error from API fetch', fetchResult.error)
        if (err instanceof ApolloError) {
            handleApolloError(err, true)

            if (err.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
                return <Error404 />
            }
        }

        recordJSException(err)
        return <GenericErrorPage /> // api failure or protobuf decode failure
    }

    if (fetchResult.status === 'LOADING') {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    const { data, revisionsLookup } = fetchResult
    const pkg = data.fetchHealthPlanPackage.pkg

    // Display generic error page if getting logged in user returns undefined.
    if (!loggedInUser) {
        return <GenericErrorPage />
    }

    const submissionStatus = pkg.status

    //The sideNav should not be visible to a state user if the submission is a draft that has never been submitted
    const showSidebar =
        showQuestionResponse &&
        submissionStatus !== 'DRAFT' &&
        pkg.initiallySubmittedAt !== null &&
        QUESTION_RESPONSE_SHOW_SIDEBAR_ROUTES.includes(routeName)

    const isCMSUser = loggedInUser?.role === 'CMS_USER'
    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const isHelpdeskUser = loggedInUser?.role === 'HELPDESK_USER'
    const isBusinessOwnerUser = loggedInUser?.role === 'BUSINESSOWNER_USER'
    const isFormPage =
        (submissionStatus === 'UNLOCKED' || submissionStatus === 'DRAFT') &&
        isStateUser
    // CMS Users can't see DRAFT, it's an error
    if (
        submissionStatus === 'DRAFT' &&
        (isCMSUser || isAdminUser || isHelpdeskUser || isBusinessOwnerUser)
    ) {
        return <GenericErrorPage />
    }

    // Current Revision is either the last submitted revision (cms users) or the most recent revision (for state users looking submission form)
    const edge =
        (submissionStatus === 'UNLOCKED' || submissionStatus === 'DRAFT') &&
        loggedInUser.role === 'STATE_USER'
            ? pkg.revisions[0]
            : pkg.revisions.find((rEdge) => rEdge.node.submitInfo)
    if (!edge) {
        const errMsg = `Not able to determine current revision for sidebar: ${pkg.id}, programming error.`
        recordJSException(errMsg)
        return <GenericErrorPage />
    }
    const currentRevision = edge.node
    const packageData = revisionsLookup[currentRevision.id].formData
    const pkgName = packageName(
        packageData.stateCode,
        packageData.stateNumber,
        packageData.programIDs,
        pkg.state.programs
    )
    const documentDates = makeDocumentDateTable(revisionsLookup)
    const outletContext: SideNavOutletContextType = {
        pkg,
        packageName: pkgName,
        currentRevision,
        packageData,
        documentDates,
        user: loggedInUser,
    }

    return (
        <div
            className={
                isFormPage ? styles.backgroundForm : styles.backgroundSidebar
            }
            data-testid="submission-side-nav"
        >
            <GridContainer className={styles.container}>
                {showSidebar && (
                    <div className={styles.verticalNavContainer}>
                        <div className={styles.backLinkContainer}>
                            <Link
                                asCustom={NavLink}
                                to={{
                                    pathname:
                                        RoutesRecord.DASHBOARD_SUBMISSIONS,
                                }}
                            >
                                <Icon.ArrowBack />
                                {loggedInUser?.__typename === 'StateUser' ? (
                                    <span>&nbsp;Back to state dashboard</span>
                                ) : (
                                    <span>&nbsp;Back to dashboard</span>
                                )}
                            </Link>
                        </div>
                        <SideNav
                            items={[
                                <Link
                                    to={
                                        isStateUser &&
                                        submissionStatus === 'UNLOCKED'
                                            ? `/submissions/${id}/edit/review-and-submit`
                                            : `/submissions/${id}`
                                    }
                                    asCustom={NavLink}
                                    className={isSelectedLink(
                                        isStateUser &&
                                            submissionStatus === 'UNLOCKED'
                                            ? STATE_SUBMISSION_FORM_ROUTES
                                            : 'SUBMISSIONS_SUMMARY'
                                    )}
                                >
                                    {isStateUser &&
                                    submissionStatus === 'UNLOCKED'
                                        ? 'Submission'
                                        : 'Submission summary'}
                                </Link>,
                                <Link
                                    to={`/submissions/${id}/question-and-answers`}
                                    asCustom={NavLink}
                                    className={isSelectedLink(
                                        'SUBMISSIONS_QUESTIONS_AND_ANSWERS'
                                    )}
                                >
                                    Q&A
                                </Link>,
                            ]}
                        />
                    </div>
                )}
                <Outlet context={outletContext} />
            </GridContainer>
        </div>
    )
}
