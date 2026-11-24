import React from 'react'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { useQuery } from '@apollo/client/react'
import { featureFlags } from '@mc-review/common-code'
import { handleApolloError, isLikelyUserAuthError } from '@mc-review/helpers'
import { recordJSException } from '@mc-review/otel'
import { useAuth } from '../../../contexts/AuthContext'
import { IndexContractsStrippedDocument } from '../../../gen/gqlClient'
import {
    ErrorAlertSignIn,
    ContractTable,
    ContractInDashboardType,
    GenericApiErrorBanner,
    Loading,
} from '../../../components'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

/**
 * Content of the All submissions tab on the state dashboard.
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 */
const StateSubmissionsDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const ldClient = useLDClient()
    const useStoredContractActionDates = ldClient?.variation(
        featureFlags.USE_STORED_CONTRACT_ACTION_DATES.flag,
        featureFlags.USE_STORED_CONTRACT_ACTION_DATES.defaultValue
    )

    const { loading, data, error } = useQuery(IndexContractsStrippedDocument, {
        fetchPolicy: 'cache-and-network',
        pollInterval: 120000,
    })

    // Memoized so the table rows keep their identity when the tab renders again with the same data.
    const submissionRows = React.useMemo(() => {
        const rows: ContractInDashboardType[] = []
        const programs =
            loggedInUser?.__typename === 'StateUser'
                ? loggedInUser.state.programs.filter(
                      (program) => !program.isRateProgram
                  )
                : []
        const submissionEdges = data?.indexContractsStripped.edges ?? []
        submissionEdges
            .map((edge) => edge.node)
            .forEach((sub) => {
                const subReviewActions =
                    sub.reviewStatusActions && sub.reviewStatusActions[0]

                if (
                    sub.status === 'SUBMITTED' ||
                    sub.status === 'RESUBMITTED'
                ) {
                    const currentRevision = sub.latestSubmittedRevision

                    if (!currentRevision) {
                        recordJSException(
                            `Unexpected error: Submitted Contract with ID ${sub.id} did not contain a latestSubmittedRevision`
                        )
                        return
                    }
                    rows.push({
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

                    rows.push({
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
        return rows
    }, [data, loggedInUser, useStoredContractActionDates])

    if (!data && loading) {
        return <Loading />
    } else if (!data && error) {
        handleApolloError(error, true)
        return isLikelyUserAuthError(error, true) ? (
            <ErrorAlertSignIn />
        ) : (
            <GenericApiErrorBanner />
        )
    } else if (!data || !loggedInUser) {
        return <GenericErrorPage />
    }

    return (
        <ContractTable
            tableData={submissionRows}
            user={loggedInUser}
            showFilters
        />
    )
}

export { StateSubmissionsDashboard }
