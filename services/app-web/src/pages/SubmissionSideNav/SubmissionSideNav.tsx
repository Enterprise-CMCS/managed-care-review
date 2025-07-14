import { SideNav, GridContainer, Icon } from '@trussworks/react-uswds'
import styles from './SubmissionSideNav.module.scss'
import { useParams, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    QUESTION_RESPONSE_SHOW_SIDEBAR_ROUTES,
    RoutesRecord,
    STATE_SUBMISSION_FORM_ROUTES,
} from '@mc-review/constants'
import { getRouteName } from '../../routeHelpers'
import {
    ContractFormData,
    ContractPackageSubmission,
    ContractRevision,
    useFetchContractWithQuestionsQuery,
} from '../../gen/gqlClient'
import { Loading, NavLinkWithLogging } from '../../components'
import { ApolloError } from '@apollo/client'
import { handleApolloError } from '@mc-review/helpers'
import { recordJSException } from '@mc-review/otel'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404Page'
import { Contract, User } from '../../gen/gqlClient'
import { isUnlockedOrDraft, shouldUseFormPageStyles } from './helpers'

export type SideNavOutletContextType = {
    contract: Contract
    packageName: string
    currentRevision: ContractPackageSubmission | ContractRevision
    contractFormData: ContractFormData | undefined
    user: User
}

export const SubmissionSideNav = () => {
    const { id, rateID } = useParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const routeName = getRouteName(pathname)

    const isSelectedLink = (route: string | string[]): string => {
        //We pass an array of the form routes in order to display the sideNav on all of the pages
        if (typeof route != 'string') {
            return route.includes(routeName) ? 'usa-current' : ''
        } else {
            return routeName === route ? 'usa-current' : ''
        }
    }

    const isSelectedRateLink = (id: string) => {
        if (routeName === 'SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS') {
            return rateID ? (rateID === id ? 'usa-current' : '') : ''
        }
    }

    const { data, loading, error } = useFetchContractWithQuestionsQuery({
        variables: {
            input: {
                contractID: id,
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const contract = data?.fetchContract.contract

    if (!data && loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (!data && error) {
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
    } else if (!loggedInUser || !contract) {
        return <GenericErrorPage />
    }

    const submissionStatus = contract.status

    //The sideNav should not be visible to a state user if the submission is a draft that has never been submitted
    const showSidebar =
        submissionStatus !== 'DRAFT' &&
        contract.initiallySubmittedAt !== null &&
        QUESTION_RESPONSE_SHOW_SIDEBAR_ROUTES.includes(routeName)

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    // Only State users can see a draft submission
    if (submissionStatus === 'DRAFT' && !isStateUser) {
        return <GenericErrorPage />
    }

    // Current Revision is either the last submitted revision (cms users) or the most recent revision (for state users looking submission form)
    const submittedEdge =
        (submissionStatus === 'SUBMITTED' ||
            submissionStatus === 'RESUBMITTED') &&
        contract.packageSubmissions[0]
    const draftEdge =
        (submissionStatus === 'UNLOCKED' || submissionStatus === 'DRAFT') &&
        contract.draftRevision
    if (!submittedEdge && !draftEdge) {
        const errMsg = `Not able to determine current revision for sidebar: ${contract.id}, programming error.`
        recordJSException(errMsg)
        return <GenericErrorPage />
    }
    const currentRevision = submittedEdge || draftEdge
    const contractFormData = submittedEdge
        ? submittedEdge.contractRevision.formData
        : draftEdge && draftEdge.formData
    const contractName = submittedEdge
        ? submittedEdge.contractRevision.contractName
        : draftEdge && draftEdge.contractName
    if (!contractName || !contractFormData || !currentRevision) {
        const errMsg = `Not able to derive data from current revision for sidebar: ${contract.id}, programming error.`
        recordJSException(errMsg)
        return <GenericErrorPage />
    }

    // All of this logic is to enable conditional styles with sidenabv
    const isEditable = isUnlockedOrDraft(submissionStatus)
    const isFormPage = shouldUseFormPageStyles(
        routeName,
        loggedInUser,
        isEditable
    )

    const generateRateLinks = () => {
        const rateRevision = contract.packageSubmissions[0].rateRevisions
        const programs = contract.state.programs

        if (submissionStatus === 'DRAFT' || !rateRevision) {
            return []
        }

        return rateRevision.map((rev) => {
            const useDeprecatedRateProgramIDs =
                rev.formData.deprecatedRateProgramIDs.length > 0 &&
                rev.formData.rateProgramIDs.length === 0
            const ratePrograms = useDeprecatedRateProgramIDs
                ? rev.formData.deprecatedRateProgramIDs
                : rev.formData.rateProgramIDs
            const rateProgramNames = ratePrograms
                .map(
                    (id) =>
                        programs.find((program) => program.id === id)?.name ||
                        'Unknown Program'
                )
                .join(' ')
            return (
                <NavLinkWithLogging
                    to={`/submissions/${id}/rates/${rev.rateID}/question-and-answers`}
                    className={isSelectedRateLink(rev.rateID)}
                    event_name="navigation_clicked"
                >
                    Rate questions: <br />
                    {rateProgramNames || 'Unknown Program(s)'}
                </NavLinkWithLogging>
            )
        })
    }

    const outletContext: SideNavOutletContextType = {
        contract,
        packageName: contractName,
        currentRevision,
        contractFormData,
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
                            <NavLinkWithLogging
                                to={{
                                    pathname:
                                        RoutesRecord.DASHBOARD_SUBMISSIONS,
                                }}
                                event_name="back_button"
                            >
                                <Icon.ArrowBack />
                                {loggedInUser?.__typename === 'StateUser' ? (
                                    <span>&nbsp;Go to state dashboard</span>
                                ) : (
                                    <span>&nbsp;Go to dashboard</span>
                                )}
                            </NavLinkWithLogging>
                        </div>
                        <SideNav
                            items={[
                                <NavLinkWithLogging
                                    to={
                                        isStateUser &&
                                        submissionStatus === 'UNLOCKED'
                                            ? `/submissions/${id}/edit/review-and-submit`
                                            : `/submissions/${id}`
                                    }
                                    className={isSelectedLink(
                                        isStateUser &&
                                            submissionStatus === 'UNLOCKED'
                                            ? STATE_SUBMISSION_FORM_ROUTES
                                            : 'SUBMISSIONS_SUMMARY'
                                    )}
                                    event_name="navigation_clicked"
                                >
                                    {isStateUser &&
                                    submissionStatus === 'UNLOCKED'
                                        ? 'Submission'
                                        : 'Submission summary'}
                                </NavLinkWithLogging>,
                                <NavLinkWithLogging
                                    to={`/submissions/${id}/question-and-answers`}
                                    className={isSelectedLink(
                                        'SUBMISSIONS_CONTRACT_QUESTIONS_AND_ANSWERS'
                                    )}
                                    event_name="navigation_clicked"
                                >
                                    Contract questions
                                </NavLinkWithLogging>,
                                ...(isStateUser ? generateRateLinks() : []),
                            ]}
                        />
                    </div>
                )}
                <Outlet context={outletContext} />
            </GridContainer>
        </div>
    )
}
