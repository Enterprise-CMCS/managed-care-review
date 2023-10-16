import { GridContainer } from '@trussworks/react-uswds'
import React from 'react'
import { packageName } from '../../common-code/healthPlanFormDataType'
import { base64ToDomain } from '../../common-code/proto/healthPlanFormDataProto'
import { SubmissionTypeRecord } from '../../constants/healthPlanPackages'
import { useAuth } from '../../contexts/AuthContext'
import {
    useIndexHealthPlanPackagesQuery,
    useIndexRatesQuery,
} from '../../gen/gqlClient'
import { mostRecentDate } from '../../common-code/dateHelpers'
import styles from '../StateDashboard/StateDashboard.module.scss'
import { recordJSException } from '../../otelHelpers/tracingHelper'
import {
    Loading,
    HealthPlanPackageTable,
    PackageInDashboardType,
    Tabs,
    TabPanel,
} from '../../components'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { Outlet, useLocation } from 'react-router-dom'
import { ErrorFailedRequestPage } from '../Errors/ErrorFailedRequestPage'
import { RoutesRecord } from '../../constants'
import { featureFlags } from '../../common-code/featureFlags'
import { RateInDashboardType, RateReviewsTable } from './RateReviewsTable'

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 * Depending on submission status, CMS users look at data from current or previous revision
 */
const DASHBOARD_ATTRIBUTE = 'cms-dashboard-page'
const CMSDashboard = (): React.ReactElement => {
    const { pathname } = useLocation()
    const loadOnRateReviews = pathname === RoutesRecord.DASHBOARD_RATES
    const ldClient = useLDClient()
    const showRateReviews = ldClient?.variation(
        featureFlags.RATE_REVIEWS_DASHBOARD.flag,
        featureFlags.RATE_REVIEWS_DASHBOARD.defaultValue
    )
    const TAB_NAMES = {
        RATES: 'Rate reviews',
        SUBMISSIONS: 'Submissions',
    }
    return (
        <div data-testid={DASHBOARD_ATTRIBUTE} className={styles.wrapper}>
            <GridContainer className={styles.container}>
                <div className={styles.panelHeader}>
                    <h2>
                        Submissions
                        {showRateReviews && <span> and rate reviews</span>}
                    </h2>
                </div>

                {showRateReviews ? (
                    <Tabs
                        defaultActiveTab={
                            loadOnRateReviews
                                ? TAB_NAMES.RATES
                                : TAB_NAMES.SUBMISSIONS
                        }
                        className={styles.tabs}
                    >
                        <TabPanel
                            id="submissions"
                            nestedRoute={RoutesRecord.DASHBOARD_SUBMISSIONS}
                            tabName={TAB_NAMES.SUBMISSIONS}
                        >
                            <Outlet />
                        </TabPanel>

                        <TabPanel
                            id="rate-reviews"
                            nestedRoute={RoutesRecord.DASHBOARD_RATES}
                            tabName={TAB_NAMES.RATES}
                        >
                            <Outlet />
                        </TabPanel>
                    </Tabs>
                ) : (
                    <Outlet />
                )}
            </GridContainer>
        </div>
    )
}

const SubmissionsDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const { loading, data, error } = useIndexHealthPlanPackagesQuery({
        fetchPolicy: 'network-only',
    })

    if (loading || !loggedInUser) {
        return <Loading />
    } else if (error) {
        return (
            <ErrorFailedRequestPage
                error={error}
                testID={DASHBOARD_ATTRIBUTE}
            />
        )
    }

    const submissionRows: PackageInDashboardType[] = []
    data?.indexHealthPlanPackages.edges
        .map((edge) => edge.node)
        .forEach((sub) => {
            const currentRevision = sub.revisions[0]
            const currentFormData = base64ToDomain(
                currentRevision.node.formDataProto
            )

            // Errors - data handling
            if (sub.status === 'DRAFT') {
                recordJSException(
                    `indexHealthPlanPackagesQuery: should not return draft submissions for CMS user. ID: ${sub.id}`
                )
                return
            }
            if (currentFormData instanceof Error) {
                recordJSException(
                    `indexHealthPlanPackagesQuery: Error decoding proto. ID: ${sub.id} Error message: ${currentFormData.message}`
                )

                return null
            }

            if (
                currentRevision?.node?.submitInfo?.updatedAt === undefined &&
                currentRevision?.node?.unlockInfo?.updatedAt === undefined
            ) {
                recordJSException(
                    `indexHealthPlanPackagesQuery: Error finding submit and unlock dates for submissions in CMSDashboard. ID: ${sub.id}`
                )
            }

            // Set package display data
            let displayRateFormData = currentFormData
            let lastUpdated = mostRecentDate([
                currentRevision?.node?.submitInfo?.updatedAt,
                currentRevision?.node?.unlockInfo?.updatedAt,
            ])

            if (sub.status === 'UNLOCKED') {
                // Errors - data handling
                const previousRevision = sub?.revisions[1]
                const previousFormData = base64ToDomain(
                    previousRevision?.node?.formDataProto
                )
                if (previousFormData instanceof Error) {
                    recordJSException(
                        `indexHealthPlanPackagesQuery: Error decoding proto for display of an unlocked submission. ID: ${sub.id} Error message: ${previousFormData.message}`
                    )

                    return
                }

                if (
                    previousRevision?.node?.submitInfo?.updatedAt ===
                        undefined &&
                    previousRevision?.node?.unlockInfo?.updatedAt === undefined
                ) {
                    recordJSException(
                        `indexHealthPlanPackagesQuery: Error finding submit and unlock dates of an unlocked submission. ID: ${sub.id}`
                    )
                }

                // reset package display data since unlock submissions rely on previous revision data
                displayRateFormData = previousFormData
                lastUpdated = mostRecentDate([
                    currentRevision?.node?.submitInfo?.updatedAt,
                    currentRevision?.node?.unlockInfo?.updatedAt,
                    previousRevision?.node?.submitInfo?.updatedAt,
                    previousRevision?.node?.unlockInfo?.updatedAt,
                ])
            }

            if (!lastUpdated) {
                recordJSException(
                    `CMSDashboard: Cannot find valid last updated date from submit and unlock info. Falling back to current revision's last edit timestamp. ID: ${sub.id}`
                )
                lastUpdated = new Date(currentFormData.updatedAt)
            }
            const programs = sub.state.programs

            submissionRows.push({
                id: sub.id,
                name: packageName(
                    displayRateFormData.stateCode,
                    displayRateFormData.stateNumber,
                    displayRateFormData.programIDs,
                    programs
                ),
                programs: programs.filter((program) =>
                    displayRateFormData.programIDs.includes(program.id)
                ),
                submittedAt: sub.initiallySubmittedAt,
                status: sub.status,
                updatedAt: lastUpdated,
                submissionType:
                    SubmissionTypeRecord[displayRateFormData.submissionType],
                stateName: sub.state.name,
            })
        })

    return (
        <section className={styles.panel}>
            <HealthPlanPackageTable
                tableData={submissionRows}
                user={loggedInUser}
                showFilters
            />
        </section>
    )
}
const RateReviewsDashboard = (): React.ReactElement => {
    const { loggedInUser } = useAuth()
    const { data, loading, error } = useIndexRatesQuery({
        fetchPolicy: 'network-only',
    })

    const reviewRows: RateInDashboardType[] = []
    data?.indexRates.edges
        .map((edge) => edge.node)
        .forEach((rate) => {
            const currentRevision = rate.revisions[0]

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
                programs: programs.filter(
                    (program) =>
                        displayRateFormData?.rateProgramIDs &&
                        displayRateFormData.rateProgramIDs.includes(program.id) // only show programs that are still assigned to that state
                ),
                submittedAt: rate.initiallySubmittedAt,
                rateDateStart: displayRateFormData.rateDateStart,
                rateDateEnd: displayRateFormData.rateDateEnd,
                status: rate.status,
                updatedAt: lastUpdated,
                rateType: displayRateFormData.rateType || 'NEW',
                stateName: rate.state.name,
                contractRevisions: currentRevision.contractRevisions,
            })
        })

    if (loading || !loggedInUser) {
        return <Loading />
    } else if (error) {
        return (
            <ErrorFailedRequestPage
                error={error}
                testID={DASHBOARD_ATTRIBUTE}
            />
        )
    } else {
        return (
            <section className={styles.panel}>
                <RateReviewsTable tableData={reviewRows} />
            </section>
        )
    }
}

export { CMSDashboard, RateReviewsDashboard, SubmissionsDashboard }
