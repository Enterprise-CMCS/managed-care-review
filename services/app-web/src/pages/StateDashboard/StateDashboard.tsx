import { GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useIndexContractsQuery } from '../../gen/gqlClient'
import styles from './StateDashboard.module.scss'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'
import {
    handleApolloError,
    isLikelyUserAuthError,
} from '../../gqlHelpers/apolloErrors'
import {
    ErrorAlertSignIn,
    ContractTable,
    PackageInDashboardType,
    Loading,
    GenericApiErrorBanner,
    NavLinkWithLogging,
} from '../../components'

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 */

const DASHBOARD_ATTRIBUTE = 'state-dashboard-page'
export const StateDashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const location = useLocation()

    const { loading, data, error } = useIndexContractsQuery({
        fetchPolicy: 'network-only',
    })

    if (error) {
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
    }

    if (loginStatus === 'LOADING' || !loggedInUser || loading || !data) {
        return <Loading />
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
    const submissionRows: PackageInDashboardType[] = []

    data?.indexContracts.edges
        .map((edge) => edge.node)
        .forEach((sub) => {
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
                    status: sub.status,
                    updatedAt: currentRevision.contractRevision.updatedAt,
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
                })
            }
        })

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    return (
        <>
            <div data-testid={DASHBOARD_ATTRIBUTE} className={styles.wrapper}>
                <GridContainer className={styles.container}>
                    {programs.length ? (
                        <section className={styles.panel}>
                            {justSubmittedSubmissionName && (
                                <SubmissionSuccessMessage
                                    submissionName={justSubmittedSubmissionName}
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
