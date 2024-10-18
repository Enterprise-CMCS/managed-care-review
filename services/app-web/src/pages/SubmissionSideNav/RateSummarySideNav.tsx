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
import { useFetchRateQuery } from '../../gen/gqlClient'
import { ApolloError } from '@apollo/client'
import { handleApolloError } from '../../gqlHelpers/apolloErrors'
import { Error404 } from '../Errors/Error404Page'
import { recordJSException } from '../../otelHelpers'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Loading, NavLinkWithLogging } from '../../components'
import { RoutesRecord } from '../../constants'

export const RateSummarySideNav = () => {
    const { id } = useParams() as { id: string }
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const routeName = getRouteName(pathname)

    const shouldRedirect = matchPath(
        RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS,
        pathname
    )

    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
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

    if (error) {
        const err = error
        console.error('Error from API fetch', error)
        if (err instanceof ApolloError) {
            handleApolloError(err, true)

            if (err.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
                return <Error404 />
            }
        }

        recordJSException(err)
        return <GenericErrorPage /> // api failure or protobuf decode failure
    }

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    const rate = data?.fetchRate.rate

    if (!loggedInUser || !rate || rate.status === 'DRAFT') {
        return <GenericErrorPage />
    }

    return (
        <div
            className={styles.backgroundSidebar}
            data-testid="rate-summary-side-nav"
        >
            <GridContainer className={styles.container}>
                <div className={styles.verticalNavContainer}>
                    <div className={styles.backLinkContainer}>
                        <NavLinkWithLogging
                            to={{ pathname: RoutesRecord.DASHBOARD_RATES }}
                            event_name="back_button"
                        >
                            <Icon.ArrowBack />
                            <span>{` Back to dashboard`}</span>
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
                <Outlet />
            </GridContainer>
        </div>
    )
}
