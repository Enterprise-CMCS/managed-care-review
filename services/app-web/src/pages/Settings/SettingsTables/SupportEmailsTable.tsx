import { useOutletContext } from 'react-router-dom'
import { MCReviewSettingsContextType } from '../Settings'
import { Grid, Table } from '@trussworks/react-uswds'
import styles from '../Settings.module.scss'
import React from 'react'

const SupportEmailsTable = () => {
    const { emailConfig: config } =
        useOutletContext<MCReviewSettingsContextType>()
    return (
        <Grid className={styles.tableContainer}>
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
                        <th>Inbox</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{config?.helpDeskEmail}</td>
                        <td>Help desk email</td>
                        <td>For general MC-Review application support</td>
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
        </Grid>
    )
}

export { SupportEmailsTable }
