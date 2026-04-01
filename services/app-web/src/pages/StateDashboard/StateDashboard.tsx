import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    ContractSubmissionType,
    useIndexSubmissionsQuery,
} from '../../gen/gqlClient'
import styles from './StateDashboard.module.scss'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'
import { handleApolloError, isLikelyUserAuthError } from '@mc-review/helpers'
import {
    ErrorAlertSignIn,
    ContractTable,
    ContractInDashboardType,
    Loading,
    GenericApiErrorBanner,
    NavLinkWithLogging,
} from '../../components'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { usePage } from '../../contexts/PageContext'

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 */

const DASHBOARD_ATTRIBUTE = 'state-dashboard-page'
export const StateDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const location = useLocation()
    const { updateActiveMainContent } = usePage()

    const { loading, data, error } = useIndexSubmissionsQuery({
        fetchPolicy: 'cache-and-network',
        pollInterval: 120000,
    })

    const activeMainContentId = DASHBOARD_ATTRIBUTE

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (!data && loading) {
        return <Loading />
    } else if (!data && error) {
        handleApolloError(error, true)
        return (
            <div id={DASHBOARD_ATTRIBUTE} className={styles.wrapper}>
                <GridContainer className={styles.container}>
                    {isLikelyUserAuthError(error, true) ? (
                        <ErrorAlertSignIn />
                    ) : (
                        <GenericApiErrorBanner />
                    )}
                </GridContainer>
            </div>
        )
    } else if (!data || !loggedInUser) {
        return <GenericErrorPage />
    }

    if (loggedInUser.__typename !== 'StateUser') {
        return (
            <div id={DASHBOARD_ATTRIBUTE} className={styles.wrapper}>
                <div>State dashboard only visible for state users.</div>{' '}
            </div>
        )
    }

    const programs = loggedInUser.state.programs.filter(
        (program) => !program.isRateProgram
    )
    const submissionRows: ContractInDashboardType[] =
        data.indexSubmissions.edges.map((edge: any) => ({
            id: edge.node.id,
            name: edge.node.name,
            programs: edge.node.programs.filter((program: any) =>
                programs.some((stateProgram) => stateProgram.id === program.id)
            ),
            submittedAt: edge.node.submittedAt ?? undefined,
            status: edge.node.status,
            updatedAt: new Date(edge.node.updatedAt),
            contractSubmissionType: edge.node.contractSubmissionType,
            submissionType: edge.node.submissionType ?? undefined,
        }))

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    const submissionId = new URLSearchParams(location.search).get('id')

    const contractType = new URLSearchParams(location.search).get(
        'contractType'
    ) as ContractSubmissionType | null

    return (
        <>
            <div
                id={DASHBOARD_ATTRIBUTE}
                data-testid={DASHBOARD_ATTRIBUTE}
                className={styles.wrapper}
            >
                <GridContainer className={styles.container}>
                    {programs.length ? (
                        <section className={styles.panel}>
                            {justSubmittedSubmissionName && (
                                <SubmissionSuccessMessage
                                    submissionName={justSubmittedSubmissionName}
                                    submissionId={submissionId || undefined}
                                    contractType={contractType || undefined}
                                />
                            )}

                            <div className={styles.panelHeader}>
                                <h2>Submissions</h2>
                                <div>
                                    <NavLinkWithLogging
                                        className="usa-button"
                                        variant="unstyled"
                                        to={{
                                            pathname: '/submissions/new',
                                        }}
                                    >
                                        Start new submission
                                    </NavLinkWithLogging>
                                </div>
                            </div>
                            <ContractTable
                                tableData={submissionRows}
                                user={loggedInUser}
                            />
                        </section>
                    ) : (
                        <p>No programs exist</p>
                    )}
                </GridContainer>
            </div>
        </>
    )
}
