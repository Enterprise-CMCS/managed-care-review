import { Table } from '@trussworks/react-uswds'
import React from 'react'
import { Loading } from '../../../components'
import {
    EmailConfiguration,
    useFetchEmailSettingsQuery,
} from '../../../gen/gqlClient'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import styles from '../Settings.module.scss'
import {
    EmailAnalystsTable,
    type StateAnalystsInDashboardType,
} from './EmailAnalystsTable'

const formatEmails = (arr?: string[]) => (arr ? arr.join(',') : 'NOT DEFINED')

const EmailSettingsTable = ({
    type,
}: {
    type: 'GENERAL' | 'ANALYSTS' | 'SUPPORT'
}): React.ReactElement => {
    const { loading, data, error } = useFetchEmailSettingsQuery()
    const config = data?.fetchEmailSettings.config
    const analysts: StateAnalystsInDashboardType[] = data?.fetchEmailSettings
        .stateAnalysts
        ? data.fetchEmailSettings.stateAnalysts.map((sa) => ({
              emails: sa.emails,
              stateCode: sa.stateCode,
          }))
        : []
    if (error) return <SettingsErrorAlert error={error} />
    return (
        <div className={styles.table}>
            {loading && <Loading />}

            {data && config && type === 'GENERAL' && (
                <EmailGeneralTable config={config} />
            )}

            {data && analysts && type === 'ANALYSTS' && (
                <EmailAnalystsTable analysts={analysts} />
            )}
            {data && config && type === 'SUPPORT' && (
                <EmailSupportTable config={config} />
            )}
        </div>
    )
}

const EmailGeneralTable = ({ config }: { config: EmailConfiguration }) => {
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
        </>
    )
}

const EmailSupportTable = ({ config }: { config: EmailConfiguration }) => {
    return (
        <>
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
        </>
    )
}

export { EmailSettingsTable, formatEmails }
