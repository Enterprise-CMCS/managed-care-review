import { GridContainer, Link } from '@trussworks/react-uswds'
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { packageName } from '@managed-care-review/common-code/healthPlanFormDataType'
import { useAuth } from '../../contexts/AuthContext'
import { useIndexHealthPlanPackagesQuery } from '../../gen/gqlClient'
import styles from './StateDashboard.module.scss'
import { SubmissionSuccessMessage } from './SubmissionSuccessMessage'
import { GenericApiErrorBanner } from '../../components/Banner/GenericApiErrorBanner/GenericApiErrorBanner'
import {
    handleApolloError,
    isLikelyUserAuthError,
} from '../../gqlHelpers/apolloErrors'
import {
    ErrorAlertSignIn,
    HealthPlanPackageTable,
    PackageInDashboardType,
    Loading,
} from '../../components'
import { getCurrentRevisionFromHealthPlanPackage } from '../../gqlHelpers'

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 */

export const StateDashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const location = useLocation()

    const { loading, data, error } = useIndexHealthPlanPackagesQuery()

    if (error) {
        handleApolloError(error, true)
        return (
            <div id="dashboard-page" className={styles.wrapper}>
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
            <div id="dashboard-page" className={styles.wrapper}>
                <div>CMS Users not supported yet.</div>{' '}
            </div>
        )
    }

    const programs = loggedInUser.state.programs
    const submissionRows: PackageInDashboardType[] = []

    data?.indexHealthPlanPackages.edges
        .map((edge) => edge.node)
        .forEach((sub) => {
            const currentRevisionDataOrError =
                getCurrentRevisionFromHealthPlanPackage(sub)

            if (currentRevisionDataOrError instanceof Error) {
                return
            }
            const [_, currentSubmissionData] = currentRevisionDataOrError

            submissionRows.push({
                id: sub.id,
                name: packageName(currentSubmissionData, programs),
                programs: programs.filter((program) =>
                    currentSubmissionData.programIDs.includes(program.id)
                ),
                submittedAt: sub.initiallySubmittedAt,
                status: sub.status,
                updatedAt: currentSubmissionData.updatedAt,
            })
        })

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    return (
        <>
            <div id="dashboard-page" className={styles.wrapper}>
                <GridContainer
                    className={styles.container}
                    data-testid="dashboard-page"
                >
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
                                    <Link
                                        asCustom={NavLink}
                                        className="usa-button"
                                        variant="unstyled"
                                        to={{
                                            pathname: '/submissions/new',
                                        }}
                                    >
                                        Start new submission
                                    </Link>
                                </div>
                            </div>
                            <HealthPlanPackageTable
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
