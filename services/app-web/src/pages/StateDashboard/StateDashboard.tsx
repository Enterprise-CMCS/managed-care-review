import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { RoutesRecord } from '@mc-review/constants'
import { useAuth } from '../../contexts/AuthContext'
import { ContractSubmissionType } from '../../gen/gqlClient'
import styles from './StateDashboard.module.scss'
import { NavLinkWithLogging, Tabs, TabPanel } from '../../components'
import { ErrorOrLoadingPage } from '../StateSubmission'
import { usePage } from '../../contexts/PageContext'
import { SubmissionSuccessBanner } from '../../components/Banner'

const DASHBOARD_ATTRIBUTE = 'state-dashboard-page'
const TAB_NAMES = {
    SUBMISSIONS: 'All submissions',
    ILOS: 'ILOS',
}

/**
 * The frame of the state dashboard: heading, new submission link and tabs.
 * Each tab is a nested route rendered in the Outlet and fetches its own data, as on the CMS dashboard.
 */
export const StateDashboard = (): React.ReactElement => {
    const { loggedInUser, loginStatus } = useAuth()
    const location = useLocation()
    const { updateActiveMainContent } = usePage()
    const ldClient = useLDClient()
    const showIlosSubmissions: boolean = ldClient?.variation(
        featureFlags.ILOS_SUBMISSIONS.flag,
        featureFlags.ILOS_SUBMISSIONS.defaultValue
    )

    const isIlosTab =
        showIlosSubmissions && location.pathname === RoutesRecord.DASHBOARD_ILOS

    const activeMainContentId = DASHBOARD_ATTRIBUTE

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (loginStatus === 'LOADING') {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (!loggedInUser) {
        return <ErrorOrLoadingPage state="GENERIC_ERROR" />
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

    const justSubmittedSubmissionName = new URLSearchParams(
        location.search
    ).get('justSubmitted')

    const submissionId = new URLSearchParams(location.search).get('id')

    const contractType = new URLSearchParams(location.search).get(
        'contractType'
    ) as ContractSubmissionType | null

    const activeTab = isIlosTab ? TAB_NAMES.ILOS : TAB_NAMES.SUBMISSIONS

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
                            {showIlosSubmissions ? (
                                // Keyed by the tab in the URL so the selected tab follows browser back and forward.
                                <Tabs
                                    key={activeTab}
                                    defaultActiveTab={activeTab}
                                    className={styles.tabs}
                                >
                                    <TabPanel
                                        id="submissions"
                                        nestedRoute={
                                            RoutesRecord.DASHBOARD_SUBMISSIONS
                                        }
                                        tabName={TAB_NAMES.SUBMISSIONS}
                                    >
                                        <Outlet />
                                    </TabPanel>
                                    <TabPanel
                                        id="ilos"
                                        nestedRoute={
                                            RoutesRecord.DASHBOARD_ILOS
                                        }
                                        tabName={TAB_NAMES.ILOS}
                                    >
                                        <Outlet />
                                    </TabPanel>
                                </Tabs>
                            ) : (
                                <Outlet />
                            )}
                        </section>
                    ) : (
                        <p>No programs exist</p>
                    )}
                </GridContainer>
            </div>
        </div>
    )
}
