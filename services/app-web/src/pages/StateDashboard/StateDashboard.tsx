import { GridContainer, Link } from '@trussworks/react-uswds'
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { packageName } from '../../common-code/healthPlanFormDataType'
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
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 */

const DASHBOARD_ATTRIBUTE = 'state-dashboard-page'
export const StateDashboard = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const location = useLocation()

    // Force use network until we have all the APIs in use and we can reimplement cacheing
    const ldClient = useLDClient()
    const useContractAndRatesAPI: boolean = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )

    const { loading, data, error } = useIndexHealthPlanPackagesQuery({
        fetchPolicy: useContractAndRatesAPI
            ? 'network-only'
            : 'cache-and-network',
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
                name: packageName(
                    currentSubmissionData.stateCode,
                    currentSubmissionData.stateNumber,
                    currentSubmissionData.programIDs,
                    programs
                ),
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
