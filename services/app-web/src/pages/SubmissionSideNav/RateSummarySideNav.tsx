import styles from './SubmissionSideNav.module.scss'
import { GridContainer, Icon, SideNav } from '@trussworks/react-uswds'
import {
    generatePath,
    matchPath,
    Outlet,
    Navigate,
    useLocation,
    useParams,
} from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getRouteName } from '../../routeHelpers'
import { FetchRateWithQuestionsDocument } from '../../gen/gqlClient'
import { useQuery } from '@apollo/client/react'
import { handleApolloError, toGQLError } from '@mc-review/helpers'
import { Error404 } from '../Errors/Error404Page'
import { recordJSException } from '@mc-review/otel'
import { ErrorOrLoadingPage } from '../StateSubmission/SharedSubmissionComponents/ErrorOrLoadingPage'
import { NavLinkWithLogging } from '../../components'
import { RoutesRecord } from '@mc-review/constants'
import { isUnlockedOrDraft, shouldUseFormPageStyles } from './helpers'

export const RateSummarySideNav = () => {
    const { id } = useParams() as { id: string }
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const routeName = getRouteName(pathname)

    const shouldRedirect = matchPath(
        RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS,
        pathname
    )

    const isUploadQuestionPath = matchPath(
        RoutesRecord.RATES_UPLOAD_QUESTION,
        pathname
    )

    const { data, loading, error } = useQuery(FetchRateWithQuestionsDocument, {
        variables: {
            input: {
                rateID: id,
            },
        },
        fetchPolicy: 'cache-and-network',
        skip: Boolean(shouldRedirect), //skip as we are redirecting.
    })

    // If CMS user uses the submission summary rate Q&A url, redirect to the rate summary Q&A page.
    if (shouldRedirect) {
        return (
            <Navigate
                to={generatePath(
                    RoutesRecord.RATES_SUMMARY_QUESTIONS_AND_ANSWERS,
                    { id: shouldRedirect.params.rateID }
                )}
            />
        )
    }

    const isSelectedLink = (route: string | string[]): string => {
        //We pass an array of the form routes in order to display the sideNav on all of the pages
        if (typeof route != 'string') {
            return route.includes(routeName) ? 'usa-current' : ''
        } else {
            return routeName === route ? 'usa-current' : ''
        }
    }

    const rate = data?.fetchRate.rate

    // Handle loading and error states for fetching data while using cached data
    if (!data && loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (!data && error) {
        const err = error
        console.error('Error from API fetch', error)
        handleApolloError(err, true)

        if (toGQLError(err)?.extensions.code === 'NOT_FOUND') {
            return <Error404 />
        }

        recordJSException(err)
        return <ErrorOrLoadingPage state="GENERIC_ERROR" /> // api failure
    } else if (!loggedInUser || !rate || rate.status === 'DRAFT') {
        return <ErrorOrLoadingPage state="GENERIC_ERROR" />
    }

    // All of this logic is to enable conditional styles with sidenabv
    const isEditable = isUnlockedOrDraft(rate.status)
    const isFormPage = shouldUseFormPageStyles(
        routeName,
        loggedInUser,
        isEditable
    )

    return (
        <div
            className={
                isFormPage ? styles.backgroundForm : styles.backgroundSidebar
            }
            data-testid="rate-summary-side-nav"
        >
            <GridContainer className={styles.container}>
                {!isUploadQuestionPath && (
                    <div className={styles.verticalNavContainer}>
                        <div className={styles.backLinkContainer}>
                            <NavLinkWithLogging
                                to={{ pathname: RoutesRecord.DASHBOARD_RATES }}
                                event_name="back_button"
                            >
                                <Icon.ArrowBack />
                                <span>{` Go to dashboard`}</span>
                            </NavLinkWithLogging>
                        </div>
                        <SideNav
                            items={[
                                <NavLinkWithLogging
                                    to={`/rates/${id}`}
                                    className={isSelectedLink('RATES_SUMMARY')}
                                    event_name="navigation_clicked"
                                >
                                    Rate summary
                                </NavLinkWithLogging>,
                                <NavLinkWithLogging
                                    to={`/rates/${id}/question-and-answers`}
                                    className={isSelectedLink(
                                        'RATES_SUMMARY_QUESTIONS_AND_ANSWERS'
                                    )}
                                    event_name="navigation_clicked"
                                >
                                    Rate questions
                                </NavLinkWithLogging>,
                            ]}
                        />
                    </div>
                )}
                <Outlet />
            </GridContainer>
        </div>
    )
}
