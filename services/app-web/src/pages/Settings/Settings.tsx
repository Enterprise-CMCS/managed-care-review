import React from 'react'
import { Grid, GridContainer } from '@trussworks/react-uswds'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Settings.module.scss'
import { Tabs, TabPanel, Loading, ErrorAlertSignIn } from '../../components'
import { EmailSettingsTable } from './EmailSettingsTables/EmailSettingsTables'
import { CMSUsersTable } from './CMSUsersTable/CMSUsersTable'

export const Settings = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const isAuthenticated = loginStatus === 'LOGGED_IN'
    const isAdminUser = loggedInUser?.role === 'AdminUser'
    const loading = loginStatus === 'LOADING' || !loggedInUser
    return (
        <GridContainer className={styles.pageContainer}>
            {loading ? (
                <Loading />
            ) : !isAuthenticated ? (
                <ErrorAlertSignIn />
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
                            <EmailSettingsTable
                                isAdmin={isAdminUser}
                                type="GENERAL"
                            />
                        </TabPanel>
                        <TabPanel id="analysts" tabName="State analysts">
                            <EmailSettingsTable
                                isAdmin={isAdminUser}
                                type="ANALYSTS"
                            />
                        </TabPanel>
                        <TabPanel id="support-emails" tabName="Support emails">
                            <EmailSettingsTable
                                isAdmin={isAdminUser}
                                type="SUPPORT"
                            />
                        </TabPanel>
                    </Tabs>
                </Grid>
            )}
        </GridContainer>
    )
}
