import { GridContainer } from '@trussworks/react-uswds'
import React from 'react'

import styles from '../StateDashboard/StateDashboard.module.scss'

import { Tabs, TabPanel } from '../../components'
import { Outlet, useLocation } from 'react-router-dom'
import { RoutesRecord } from '@mc-review/constants'

const CMSDashboard = (): React.ReactElement => {
    const { pathname } = useLocation()
    const loadOnRateReviews = pathname === RoutesRecord.DASHBOARD_RATES
    const TAB_NAMES = {
        RATES: 'Rate reviews',
        SUBMISSIONS: 'Submissions',
    }
    return (
        <div data-testid="cms-dashboard-page" className={styles.wrapper}>
            <GridContainer className={styles.container}>
                <section className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Submissions and rate reviews</h2>
                    </div>
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
                </section>
            </GridContainer>
        </div>
    )
}

export { CMSDashboard }
