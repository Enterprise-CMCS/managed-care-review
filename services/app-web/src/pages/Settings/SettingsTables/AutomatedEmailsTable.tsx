import { useOutletContext } from 'react-router-dom'
import { MCReviewSettingsContextType } from '../Settings'
import { Table } from '@trussworks/react-uswds'
import React from 'react'
import { Loading } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { formatEmails } from '../SettingsCells/SettingsCells'

const AutomatedEmailsTable = () => {
    const { emailConfig: config } =
        useOutletContext<MCReviewSettingsContextType>()

    if (config.loading) return <Loading />

    if (config.error) return <SettingsErrorAlert error={config.error} />

    return (
        <>
            <h2>Automated emails</h2>
            <p>
                Shared inboxes receive emails for different submissions, as
                described below.
            </p>
            <Table bordered>
                <caption className="srOnly">Automated emails</caption>
                <thead>
                    <tr>
                        <th>Inbox</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{formatEmails(config?.data?.dmcoEmails)}</td>
                        <td>DMCO division emails</td>
                        <td>None</td>
                    </tr>
                    <tr>
                        <td>{formatEmails(config?.data?.dmcpReviewEmails)}</td>
                        <td>DMCP division emails used for reviews</td>
                        <td>
                            All submissions; excluding CHIP programs and PR
                            state
                        </td>
                    </tr>
                    <tr>
                        <td>
                            {formatEmails(config?.data?.dmcpSubmissionEmails)}
                        </td>
                        <td>DMCP division emails used for submissions</td>
                        <td>
                            All submissions; excluding CHIP programs and PR
                            state
                        </td>
                    </tr>
                    <tr>
                        <td>{formatEmails(config?.data?.oactEmails)}</td>
                        <td>OACT division emails</td>
                        <td>
                            Contract and rate submissions; excluding CHIP
                            programs, PR state and non risked based contraction
                        </td>
                    </tr>
                    <tr>
                        <td>
                            {formatEmails(config?.data?.devReviewTeamEmails)}
                        </td>
                        <td>Dev team emails</td>
                        <td>All emails (from CMS side and state side)</td>
                    </tr>
                </tbody>
            </Table>
        </>
    )
}

export { AutomatedEmailsTable }
