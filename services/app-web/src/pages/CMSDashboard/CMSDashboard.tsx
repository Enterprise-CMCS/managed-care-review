import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'

import styles from '../StateDashboard/StateDashboard.module.scss'

import { Tabs, TabPanel, NavLinkWithLogging } from '../../components'
import { Outlet, useLocation } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { usePage } from '../../contexts/PageContext'
import { useAuth } from '../../contexts/AuthContext'

const CMSDashboard = (): React.ReactElement => {
    const { pathname } = useLocation()
    const { updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const loadOnRateReviews = pathname === RoutesRecord.DASHBOARD_RATES
    const TAB_NAMES = {
        RATES: 'Rate reviews',
        SUBMISSIONS: 'Submissions',
    }

    const activeMainContentId = 'cmsDashboardMainContent'

    const tabPanels = [
        <TabPanel
            key="submissions"
            id="submissions"
            nestedRoute={RoutesRecord.DASHBOARD_SUBMISSIONS}
            tabName={TAB_NAMES.SUBMISSIONS}
        >
            <Outlet />
        </TabPanel>,
        <TabPanel
            key="rate-reviews"
            id="rate-reviews"
            nestedRoute={RoutesRecord.DASHBOARD_RATES}
            tabName={TAB_NAMES.RATES}
        >
            <Outlet />
        </TabPanel>,
    ]

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
                        {isAdminUser && (
                            <NavLinkWithLogging
                                to={RoutesRecord.DASHBOARD_ADMIN_SUBMISSIONS}
                            >
                                Admin submissions
                            </NavLinkWithLogging>
                        )}
                    </div>
                    <Tabs
                        defaultActiveTab={
                            loadOnRateReviews
                                ? TAB_NAMES.RATES
                                : TAB_NAMES.SUBMISSIONS
                        }
                        className={styles.tabs}
                        children={tabPanels}
                    />
                </section>
            </GridContainer>
        </div>
    )
}

export { CMSDashboard }
