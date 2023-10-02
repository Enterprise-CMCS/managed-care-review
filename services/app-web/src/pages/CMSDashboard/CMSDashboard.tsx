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
import { getRouteName } from '../../routeHelpers'

/**
 * We only pull a subset of data out of the submission and revisions for display in Dashboard
 * Depending on submission status, CMS users look at data from current or previous revision
 */
const DASHBOARD_ATTRIBUTE = 'cms-dashboard-page'
const CMSDashboard = (): React.ReactElement => {
    const { pathname } = useLocation()
    const loadOnRateReviews =
        getRouteName(pathname) === RoutesRecord.DASHBOARD_RATES
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
            let packageDataToDisplay = currentFormData
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
                packageDataToDisplay = previousFormData
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
                    packageDataToDisplay.stateCode,
                    packageDataToDisplay.stateNumber,
                    packageDataToDisplay.programIDs,
                    programs
                ),
                programs: programs.filter((program) =>
                    packageDataToDisplay.programIDs.includes(program.id)
                ),
                submittedAt: sub.initiallySubmittedAt,
                status: sub.status,
                updatedAt: lastUpdated,
                submissionType:
                    SubmissionTypeRecord[packageDataToDisplay.submissionType],
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
    const { loading, data, error } = useIndexRatesQuery({
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
    } else {
        console.warn(data?.indexRates.edges) // temporary
        return (
            <section className={styles.panel}>
                <div className="srOnly"> RATE REVIEWS DASHBOARD</div>
                <HealthPlanPackageTable
                    tableVariant="RATES"
                    tableData={[]}
                    user={loggedInUser}
                    showFilters
                />
            </section>
        )
    }
}

export { CMSDashboard, RateReviewsDashboard, SubmissionsDashboard }
