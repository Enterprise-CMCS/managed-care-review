import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { useAuth } from '../../contexts/AuthContext'
import {
    ContractSubmissionType,
    IndexContractsStrippedDocument,
} from '../../gen/gqlClient'
import { useQuery } from '@apollo/client/react'
import styles from './StateDashboard.module.scss'
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
import { recordJSException } from '@mc-review/otel'
import { SubmissionSuccessBanner } from '../../components/Banner'

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 */

const DASHBOARD_ATTRIBUTE = 'state-dashboard-page'
export const StateDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const location = useLocation()
    const { updateActiveMainContent } = usePage()
    const ldClient = useLDClient()
    const useStoredContractActionDates = ldClient?.variation(
        featureFlags.USE_STORED_CONTRACT_ACTION_DATES.flag,
        featureFlags.USE_STORED_CONTRACT_ACTION_DATES.defaultValue
    )

    const { loading, data, error } = useQuery(IndexContractsStrippedDocument, {
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
    const submissionRows: ContractInDashboardType[] = []

    data.indexContractsStripped.edges
        .map((edge) => edge.node)
        .forEach((sub) => {
            const subReviewActions =
                sub.reviewStatusActions && sub.reviewStatusActions[0]

            if (sub.status === 'SUBMITTED' || sub.status === 'RESUBMITTED') {
                const currentRevision = sub.latestSubmittedRevision

                if (!currentRevision) {
                    recordJSException(
                        `Unexpected error: Submitted Contract with ID ${sub.id} did not contain a latestSubmittedRevision`
                    )
                    return
                }
                submissionRows.push({
                    id: sub.id,
                    name: currentRevision.contractName,
                    programs: programs.filter((program) => {
                        return currentRevision.formData.programIDs.includes(
                            program.id
                        )
                    }),
                    submittedAt: sub.initiallySubmittedAt,
                    status: sub.consolidatedStatus,
                    updatedAt: useStoredContractActionDates
                        ? new Date(sub.lastUpdatedForDisplay)
                        : subReviewActions
                          ? subReviewActions.updatedAt
                          : currentRevision.updatedAt,
                    contractSubmissionType: sub.contractSubmissionType,
                })
            } else {
                const currentRevision = sub.draftRevision

                if (!currentRevision) {
                    recordJSException(
                        `Unexpected error: Contract with ID ${sub.id} did not contain a draftRevision`
                    )
                    return
                }

                submissionRows.push({
                    id: sub.id,
                    name: currentRevision.contractName,
                    programs: programs.filter((program) => {
                        return currentRevision.formData.programIDs.includes(
                            program.id
                        )
                    }),
                    submittedAt: sub.initiallySubmittedAt,
                    status: sub.consolidatedStatus,
                    updatedAt: useStoredContractActionDates
                        ? new Date(sub.lastUpdatedForDisplay)
                        : currentRevision.updatedAt,
                    contractSubmissionType: sub.contractSubmissionType,
                })
            }
        })

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    const submissionId = new URLSearchParams(location.search).get('id')

    const contractType = new URLSearchParams(location.search).get(
        'contractType'
    ) as ContractSubmissionType | null

    return (
        <div className={styles.stateDashboard}>
            <div
                id={DASHBOARD_ATTRIBUTE}
                data-testid={DASHBOARD_ATTRIBUTE}
                className={styles.wrapper}
            >
                <GridContainer className={styles.container}>
                    {programs.length ? (
                        <section className={styles.panel}>
                            {justSubmittedSubmissionName && (
                                <SubmissionSuccessBanner
                                    submissionName={justSubmittedSubmissionName}
                                    submissionId={submissionId || undefined}
                                    contractType={contractType || undefined}
                                />
                            )}

                            <div className={styles.panelHeader}>
                                <h1>Dashboard</h1>
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
                                showFilters
                            />
                        </section>
                    ) : (
                        <p>No programs exist</p>
                    )}
                </GridContainer>
            </div>
        </div>
    )
}
