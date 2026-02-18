import { useOutletContext } from 'react-router-dom'
import { MCReviewSettingsContextType } from '../Settings'
import { Table } from '@trussworks/react-uswds'
import React, { useEffect } from 'react'
import { Loading } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { formatEmails } from '../SettingsCells/SettingsCells'
import { usePage } from '../../../contexts/PageContext'

const AutomatedEmailsTable = () => {
    const { updateActiveMainContent } = usePage()
    const { emailConfig: config } =
        useOutletContext<MCReviewSettingsContextType>()

    const activeMainContentId = 'automatedEmailsPageMainContent'
    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (config.loading) return <Loading />

    if (config.error) return <SettingsErrorAlert error={config.error} />

    return (
        <div id={activeMainContentId}>
            <h2>Automated emails</h2>
            <p>
                Shared inboxes receive emails for different submissions, as
                described below.
            </p>
            <Table bordered>
                <caption className="srOnly">Automated emails</caption>
                <thead>
                    <tr>
                        <th scope="col">Inbox</th>
                        <th scope="col">Type</th>
                        <th scope="col">Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row">
                            {formatEmails(config?.data?.dmcoEmails)}
                        </th>
                        <td>DMCO division emails</td>
                        <td>All emails (from CMS side and state side)</td>
                    </tr>
                    <tr>
                        <th scope="row">
                            {formatEmails(config?.data?.dmcpReviewEmails)}
                        </th>
                        <td>DMCP division emails used for reviews</td>
                        <td>
                            All submissions; excluding CHIP programs and PR
                            state
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            {formatEmails(config?.data?.dmcpSubmissionEmails)}
                        </th>
                        <td>DMCP division emails used for submissions</td>
                        <td>
                            All submissions; excluding CHIP programs and PR
                            state
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            {formatEmails(config?.data?.oactEmails)}
                        </th>
                        <td>OACT division emails</td>
                        <td>
                            Contract and rate submissions; excluding CHIP
                            programs, PR state and non risked based contraction
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            {formatEmails(config?.data?.devReviewTeamEmails)}
                        </th>
                        <td>Dev team emails</td>
                        <td>All emails (from CMS side and state side)</td>
                    </tr>
                </tbody>
            </Table>
        </div>
    )
}

export { AutomatedEmailsTable }
