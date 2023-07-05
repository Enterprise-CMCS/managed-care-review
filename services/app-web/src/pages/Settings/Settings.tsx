import React from 'react'
import { Grid, GridContainer } from '@trussworks/react-uswds'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Settings.module.scss'
import { Tabs, TabPanel, Loading } from '../../components'
import { EmailSettingsTable } from './EmailSettingsTables/EmailSettingsTables'
import { CMSUsersTable } from './CMSUsersTable/CMSUsersTable'
import { SettingsErrorAlert } from './SettingsErrorAlert'

export const Settings = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const isAuthenticated = loginStatus === 'LOGGED_IN'
    const isAdminUser = loggedInUser?.role === 'ADMIN_USER'
    const isHelpdeskUser = loggedInUser?.role === 'HELPDESK_USER'

    const loading = loginStatus === 'LOADING' || !loggedInUser
    return (
        <GridContainer className={styles.pageContainer}>
            {loading ? (
                <Loading />
            ) : !isAuthenticated || !(isAdminUser || isHelpdeskUser) ? (
                <SettingsErrorAlert
                    isAuthenticated={isAuthenticated}
                    isAdmin={isAdminUser || isHelpdeskUser}
                />
            ) : (
                <Grid>
                    <h2>Settings</h2>
                    <Tabs className={styles.tabs}>
                        <TabPanel id="cms-users" tabName="CMS users">
                            <CMSUsersTable />
                        </TabPanel>

                        <TabPanel
                            id="automated-emails"
                            tabName="Automated emails"
                        >
                            <EmailSettingsTable type="GENERAL" />
                        </TabPanel>
                        <TabPanel id="analysts" tabName="State analysts">
                            <EmailSettingsTable type="ANALYSTS" />
                        </TabPanel>
                        <TabPanel id="support-emails" tabName="Support emails">
                            <EmailSettingsTable type="SUPPORT" />
                        </TabPanel>
                    </Tabs>
                </Grid>
            )}
        </GridContainer>
    )
}
