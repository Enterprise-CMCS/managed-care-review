import { Table } from '@trussworks/react-uswds'
import React from 'react'
import { Loading, TabPanel, Tabs } from '../../../components'
import { useFetchEmailSettingsQuery } from '../../../gen/gqlClient'

export const EmailSettings = (): React.ReactElement => {
    const { loading, data, error } = useFetchEmailSettingsQuery()
    const config = data?.fetchEmailSettings.config
    const analysts = data?.fetchEmailSettings.stateAnalysts
    console.info('ALL CONFIG', JSON.stringify(config))

    const formatEmails = (arr?: string[]) =>
        arr ? arr.join(',') : 'NOT DEFINED'
    return (
        <>
            {loading && <Loading />}
            {error && <p>An Error has occurred</p>}
            {data && (
                <Tabs>
                    <TabPanel id="automated-emails" tabName="Automated emails">
                        <p>
                            Shared inboxes receive emails for different
                            submissions, as described below.
                        </p>
                        <Table bordered caption="Automated emails">
                            <thead>
                                <th>Inbox</th>
                                <th>Type</th>
                                <th>Description</th>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{formatEmails(config?.dmcoEmails)}</td>
                                    <td>DMCO division emails</td>
                                    <td>All submissions</td>
                                </tr>
                                <tr>
                                    <td>{formatEmails(config?.dmcpEmails)}</td>
                                    <td>DMCP division emails</td>
                                    <td>
                                        All submissions; excluding CHIP programs
                                        and PR state
                                    </td>
                                </tr>
                                <tr>
                                    <td>{formatEmails(config?.oactEmails)}</td>
                                    <td>OACT division emails</td>
                                    <td>
                                        Contract and rate submissions; excluding
                                        CHIP programs and PR state
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        {formatEmails(
                                            config?.devReviewTeamEmails
                                        )}
                                    </td>
                                    <td>Dev team emails</td>
                                    <td>
                                        All emails (from CMS side and state
                                        side)
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </TabPanel>
                    <TabPanel id="analysts" tabName="State analysts">
                        <p>
                            State analysts email settings This is currently not
                            connected to Users table and is standalone
                            configuration based on thestate programs
                            spreadsheet.
                        </p>
                        <Table bordered striped caption="State analyst emails">
                            <thead>
                                <th>Inbox</th>
                                <th>State</th>
                            </thead>
                            <tbody>
                                {analysts &&
                                    analysts.map((analyst) => {
                                        return (
                                            <tr>
                                                <td>
                                                    {formatEmails(
                                                        analyst.emails || []
                                                    )}
                                                </td>
                                                <td>{analyst.stateCode}</td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </Table>
                    </TabPanel>
                    <TabPanel id="support-emails" tabName="Support emails">
                        <p>
                            States that need support should contact one of these
                            email addresses, depending on the issue. States see
                            these addresses in submission-related emails.
                        </p>
                        <Table bordered caption="Support emails">
                            <thead>
                                <th>Inbox</th>
                                <th>Type</th>
                                <th>Description</th>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        {config?.cmsDevTeamHelpEmailAddress}
                                    </td>
                                    <td>Dev team help email</td>
                                    <td>
                                        For general MC-Review application
                                        support
                                    </td>
                                </tr>
                                <tr>
                                    <td>{config?.cmsReviewHelpEmailAddress}</td>
                                    <td>Contract help email</td>
                                    <td>For contract-related support</td>
                                </tr>
                                <tr>
                                    <td>{config?.cmsRateHelpEmailAddress}</td>
                                    <td>Rate help email</td>
                                    <td>For rate-related support</td>
                                </tr>
                            </tbody>
                        </Table>
                    </TabPanel>
                </Tabs>
            )}
        </>
    )
}
