import React from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { useIndexRatesStrippedQuery } from '../../../gen/gqlClient'
import { mostRecentDate } from '@mc-review/dates'
import styles from '../../StateDashboard/StateDashboard.module.scss'
import { recordJSException } from '@mc-review/otel'
import { Loading } from '../../../components'

import { RateInDashboardType, RateReviewsTable } from './RateReviewsTable'
import { ErrorFailedRequestPage } from '../../Errors/ErrorFailedRequestPage'
import { RateTypeRecord } from '@mc-review/submissions'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

const RateReviewsDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const { data, loading, error } = useIndexRatesStrippedQuery({
        variables: {
            input: {
                stateCode: undefined,
                rateIDs: undefined,
            },
        },
        fetchPolicy: 'cache-and-network',
        pollInterval: 300000,
    })

    // Handle loading and error states for fetching data while using cached data
    if (!data && loading) {
        return <Loading />
    } else if (!data && error) {
        return (
            <ErrorFailedRequestPage
                error={error}
                testID="rate-review-dashboard"
            />
        )
    } else if (!data || !loggedInUser) {
        return <GenericErrorPage />
    }

    const reviewRows: RateInDashboardType[] = []
    data.indexRatesStripped.edges
        .map((edge) => edge.node)
        .forEach((rate) => {
            const currentRevision = rate.latestSubmittedRevision

            // Set rate display data - could be based on either current or previous revision depending on status
            const displayRateFormData = currentRevision.formData
            let lastUpdated = mostRecentDate([
                currentRevision.submitInfo?.updatedAt,
                currentRevision.unlockInfo?.updatedAt,
            ])

            if (rate.status === 'UNLOCKED') {
                // Errors - data handling
                const draftRevision = rate.draftRevision

                if (draftRevision === undefined) {
                    console.error(
                        'Programming Error: an unlocked rate came back with no draft',
                        rate
                    )
                }

                // lastUpdated comes from the draft
                lastUpdated = mostRecentDate([
                    currentRevision?.submitInfo?.updatedAt,
                    currentRevision?.unlockInfo?.updatedAt,
                    draftRevision?.unlockInfo?.updatedAt,
                ])
            }
            if (
                !displayRateFormData.rateProgramIDs ||
                !displayRateFormData.rateType ||
                !displayRateFormData.rateDateEnd ||
                !displayRateFormData.rateDateStart ||
                !displayRateFormData.rateCertificationName
            ) {
                recordJSException(
                    `CMSDashboard: Cannot calculate one of the required fields displaying rate reviews. This is unexpected and needs investigation. ID: ${
                        rate.id
                    } formData: ${JSON.stringify(displayRateFormData)})}`
                )
            }

            if (!lastUpdated) {
                recordJSException(
                    `CMSDashboard: Cannot find valid last updated date for rate reviews. This is unexpected and needs investigation. Falling back to current revision's last edit timestamp. ID: ${rate.id}`
                )
                lastUpdated = new Date(currentRevision.updatedAt)
            }

            const programs = rate.state.programs

            const missingField = 'Missing field'
            reviewRows.push({
                id: rate.id,
                name: displayRateFormData.rateCertificationName || missingField,
                rateNumber: rate.stateNumber,
                consolidatedStatus: rate.consolidatedStatus,
                programs: programs.filter(
                    (program) =>
                        (displayRateFormData?.rateProgramIDs &&
                            displayRateFormData.rateProgramIDs.includes(
                                program.id
                            )) || // only show programs that are still assigned to that state
                        (displayRateFormData?.deprecatedRateProgramIDs &&
                            displayRateFormData.deprecatedRateProgramIDs.includes(
                                program.id
                            ))
                ),
                submittedAt: rate.initiallySubmittedAt,
                rateDateStart: displayRateFormData.rateDateStart,
                rateDateEnd: displayRateFormData.rateDateEnd,
                status: rate.status,
                updatedAt: lastUpdated,
                rateType: displayRateFormData.rateType
                    ? RateTypeRecord[displayRateFormData.rateType]
                    : missingField,
                stateName: rate.state.name,
            })
        })

    return (
        <section className={styles.panel}>
            <RateReviewsTable
                tableData={reviewRows}
                isAdminUser={isAdminUser}
            />
        </section>
    )
}

export { RateReviewsDashboard }
