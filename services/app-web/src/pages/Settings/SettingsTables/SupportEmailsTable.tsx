import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { MCReviewSettingsContextType } from '../Settings'
import { Table } from '@trussworks/react-uswds'
import React from 'react'
import { Loading } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { usePage } from '../../../contexts/PageContext'

const SupportEmailsTable = () => {
    const { updateActiveMainContent } = usePage()
    const { emailConfig: config } =
        useOutletContext<MCReviewSettingsContextType>()

    const activeMainContentId = 'supportEmailsPageMainContent'
    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    if (config.loading) return <Loading />

    if (config.error || !config.data)
        return <SettingsErrorAlert error={config.error} />

    return (
        <div id={activeMainContentId}>
            <h2>Support emails</h2>
            <p>
                States that need support should contact one of these email
                addresses, depending on the issue.
            </p>
            <p>States see these addresses in submission-related emails.</p>

            <Table bordered>
                <caption className="srOnly">Support emails</caption>
                <thead>
                    <tr>
                        <th scope="col">Inbox</th>
                        <th scope="col">Type</th>
                        <th scope="col">Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th scope="row">{config?.data?.helpDeskEmail}</th>
                        <td>Help desk email</td>
                        <td>For general MC-Review application support</td>
                    </tr>
                    <tr>
                        <th scope="row">
                            {config?.data?.cmsReviewHelpEmailAddress}
                        </th>
                        <td>Contract help email</td>
                        <td>For contract-related support</td>
                    </tr>
                    <tr>
                        <th scope="row">
                            {config?.data?.cmsRateHelpEmailAddress}
                        </th>
                        <td>Rate help email</td>
                        <td>For rate-related support</td>
                    </tr>
                </tbody>
            </Table>
        </div>
    )
}

export { SupportEmailsTable }
