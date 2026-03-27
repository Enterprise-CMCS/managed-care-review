import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'

import styles from '../StateDashboard/StateDashboard.module.scss'

import { Tabs, TabPanel } from '../../components'
import { Outlet, useLocation } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { usePage } from '../../contexts/PageContext'

const CMSDashboard = (): React.ReactElement => {
    const { pathname } = useLocation()
    const { updateActiveMainContent } = usePage()
    const loadOnRateReviews = pathname === RoutesRecord.DASHBOARD_RATES
    const loadOnAdminSubmissions =
        pathname === RoutesRecord.DASHBOARD_ADMIN_SUBMISSIONS
    const TAB_NAMES = {
        RATES: 'Rate reviews',
        SUBMISSIONS: 'Submissions',
        ADMIN_SUBMISSIONS: 'Admin submissions',
    }

    const activeMainContentId = 'cmsDashboardMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])
    return (
        <div
            id={activeMainContentId}
            data-testid="cms-dashboard-page"
            className={styles.wrapper}
        >
            <GridContainer className={styles.container}>
                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Submissions and rate reviews</h2>
                    </div>
                    <Tabs
                        defaultActiveTab={
                            loadOnRateReviews
                                ? TAB_NAMES.RATES
                                : loadOnAdminSubmissions
                                  ? TAB_NAMES.ADMIN_SUBMISSIONS
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

                        <TabPanel
                            id="admin-submissions"
                            nestedRoute={
                                RoutesRecord.DASHBOARD_ADMIN_SUBMISSIONS
                            }
                            tabName={TAB_NAMES.ADMIN_SUBMISSIONS}
                        >
                            <Outlet />
                        </TabPanel>
                    </Tabs>
                </section>
            </GridContainer>
        </div>
    )
}

export { CMSDashboard }
