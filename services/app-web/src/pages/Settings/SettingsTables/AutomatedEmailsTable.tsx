import { useOutletContext } from 'react-router-dom'
import { MCReviewSettingsContextType } from '../Settings'
import { Grid, Table } from '@trussworks/react-uswds'
import styles from '../Settings.module.scss'
import React from 'react'
import { formatEmails } from '../Settings'

const AutomatedEmailsTable = () => {
    const { emailConfig: config } =
        useOutletContext<MCReviewSettingsContextType>()
    return (
        <Grid className={styles.tableContainer}>
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
                        <td>{formatEmails(config?.dmcoEmails)}</td>
                        <td>DMCO division emails</td>
                        <td>None</td>
                    </tr>
                    <tr>
                        <td>{formatEmails(config?.dmcpReviewEmails)}</td>
                        <td>DMCP division emails used for reviews</td>
                        <td>
                            All submissions; excluding CHIP programs and PR
                            state
                        </td>
                    </tr>
                    <tr>
                        <td>{formatEmails(config?.dmcpSubmissionEmails)}</td>
                        <td>DMCP division emails used for submissions</td>
                        <td>
                            All submissions; excluding CHIP programs and PR
                            state
                        </td>
                    </tr>
                    <tr>
                        <td>{formatEmails(config?.oactEmails)}</td>
                        <td>OACT division emails</td>
                        <td>
                            Contract and rate submissions; excluding CHIP
                            programs, PR state and non risked based contraction
                        </td>
                    </tr>
                    <tr>
                        <td>{formatEmails(config?.devReviewTeamEmails)}</td>
                        <td>Dev team emails</td>
                        <td>All emails (from CMS side and state side)</td>
                    </tr>
                </tbody>
            </Table>
        </Grid>
    )
}

export { AutomatedEmailsTable }
