import { Table } from '@trussworks/react-uswds'
import React from 'react'
import { Loading } from '../../../components'
import {
    EmailConfiguration,
    StateAnalystsConfiguration,
    useFetchEmailSettingsQuery,
} from '../../../gen/gqlClient'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import styles from '../Settings.module.scss'

const formatEmails = (arr?: string[]) => (arr ? arr.join(',') : 'NOT DEFINED')

export const EmailSettingsTable = ({
    type,
}: {
    type: 'GENERAL' | 'ANALYSTS' | 'SUPPORT'
}): React.ReactElement => {
    const { loading, data, error } = useFetchEmailSettingsQuery()
    const config = data?.fetchEmailSettings.config
    const analysts = data?.fetchEmailSettings.stateAnalysts
    if (error) return <SettingsErrorAlert error={error} />

    return (
        <div className={styles.table}>
            {loading && <Loading />}

            {data && config && type === 'GENERAL' && (
                <EmailsGeneralTable config={config} />
            )}

            {data && analysts && type === 'ANALYSTS' && (
                <EmailsAnalystsTable analysts={analysts} />
            )}
            {data && config && type === 'SUPPORT' && (
                <EmailsSupportTable config={config} />
            )}
        </div>
    )
}

const EmailsGeneralTable = ({ config }: { config: EmailConfiguration }) => {
    console.info('ALL CONFIG', JSON.stringify(config))
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
                        <td>{formatEmails(config?.dmcpEmails)}</td>
                        <td>DMCP division emails</td>
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
                            programs and PR state
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

const EmailsAnalystsTable = ({
    analysts,
}: {
    analysts: StateAnalystsConfiguration[]
}) => {
    return (
        <>
            <h2>State Analyst emails</h2>
            <p>
                State analysts email settings. Currently a standalone
                configuration based on the state programs spreadsheet.
            </p>
            <Table bordered>
                <caption className="srOnly">Analyst emails</caption>
                <thead>
                    <tr>
                        <th>Inbox</th>
                        <th>State</th>
                    </tr>
                </thead>
                <tbody>
                    {analysts &&
                        analysts.map((analyst, index) => {
                            return (
                                <tr key={index}>
                                    <td>
                                        {formatEmails(analyst.emails || [])}
                                    </td>
                                    <td>{analyst.stateCode}</td>
                                </tr>
                            )
                        })}
                </tbody>
            </Table>
        </>
    )
}

const EmailsSupportTable = ({ config }: { config: EmailConfiguration }) => {
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
