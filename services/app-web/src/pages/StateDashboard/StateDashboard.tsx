import { GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ContractSubmissionType, useIndexContractsForDashboardQuery } from '../../gen/gqlClient'
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

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 */

const DASHBOARD_ATTRIBUTE = 'state-dashboard-page'
export const StateDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const location = useLocation()

    const { loading, data, error } = useIndexContractsForDashboardQuery({
        fetchPolicy: 'cache-and-network',
        pollInterval: 300000,
    })

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
    const submissionRows: ContractInDashboardType[] = []

    data.indexContracts.edges
        .map((edge) => edge.node)
        .forEach((sub) => {
            // When a sub.reviewStatus has been moved out of 'UNDER_REVIEW'
            // have the reviewStatus supersede the sub.status
            const status =
                sub.reviewStatus !== 'UNDER_REVIEW'
                    ? sub.reviewStatus
                    : sub.status
            const subReviewActions =
                sub.reviewStatusActions && sub.reviewStatusActions[0]

            if (sub.status === 'SUBMITTED' || sub.status === 'RESUBMITTED') {
                const currentRevision = sub.packageSubmissions[0]
                submissionRows.push({
                    id: sub.id,
                    name: currentRevision.contractRevision.contractName,
                    programs: programs.filter((program) => {
                        return currentRevision.contractRevision.formData.programIDs.includes(
                            program.id
                        )
                    }),
                    submittedAt: sub.initiallySubmittedAt,
                    status: status,
                    updatedAt: subReviewActions
                        ? subReviewActions.updatedAt
                        : currentRevision.contractRevision.updatedAt,
                    contractSubmissionType: sub.contractSubmissionType,
                })
            } else {
                const currentRevision = sub.draftRevision!

                submissionRows.push({
                    id: sub.id,
                    name: currentRevision.contractName,
                    programs: programs.filter((program) => {
                        return currentRevision.formData.programIDs.includes(
                            program.id
                        )
                    }),
                    submittedAt: sub.initiallySubmittedAt,
                    status: sub.status,
                    updatedAt: currentRevision.updatedAt,
                    contractSubmissionType: sub.contractSubmissionType,
                })
            }
        })

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    const submissionId = new URLSearchParams(location.search).get(
        'id'
    )

    const contractType = new URLSearchParams(location.search).get('contractType') as ContractSubmissionType | null

    return (
        <>
            <div data-testid={DASHBOARD_ATTRIBUTE} className={styles.wrapper}>
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
