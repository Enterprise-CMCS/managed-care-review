import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'

import styles from '../StateDashboard/StateDashboard.module.scss'

import { Tabs, TabPanel } from '../../components'
import { Outlet, useLocation } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'
import { usePage } from '../../contexts/PageContext'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'

const CMSDashboard = (): React.ReactElement => {
    const { pathname } = useLocation()
    const { updateActiveMainContent } = usePage()
    const ldClient = useLDClient()
    const showIlosSubmissions: boolean = ldClient?.variation(
        featureFlags.ILOS_SUBMISSIONS.flag,
        featureFlags.ILOS_SUBMISSIONS.defaultValue
    )
    const loadOnRateReviews = pathname === RoutesRecord.DASHBOARD_RATES
    // The ILOS route only exists when the flag is on, so the pathname alone decides the tab.
    // The flag can resolve after the first render, which is when Tabs reads its default.
    const loadOnIlos = pathname === RoutesRecord.DASHBOARD_ILOS
    const TAB_NAMES = {
        RATES: 'Rate reviews',
        SUBMISSIONS: 'Submissions',
        ILOS: 'ILOS',
    }
    const defaultActiveTab = loadOnRateReviews
        ? TAB_NAMES.RATES
        : loadOnIlos
          ? TAB_NAMES.ILOS
          : TAB_NAMES.SUBMISSIONS

    // Tabs reads the props of each child, so the tab list has to be an array of TabPanels.
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
    if (showIlosSubmissions) {
        tabPanels.push(
            <TabPanel
                key="ilos"
                id="ilos"
                nestedRoute={RoutesRecord.DASHBOARD_ILOS}
                tabName={TAB_NAMES.ILOS}
            >
                <Outlet />
            </TabPanel>
        )
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
                        <h1>Dashboard</h1>
                    </div>
                    <Tabs
                        defaultActiveTab={defaultActiveTab}
                        className={styles.tabs}
                    >
                        {tabPanels}
                    </Tabs>
                </section>
            </GridContainer>
        </div>
    )
}

export { CMSDashboard }
