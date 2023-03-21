import { Table } from '@trussworks/react-uswds'
import React from 'react'
import { Loading } from '../../../components'
import {
    EmailConfiguration,
    StateAnalystsConfiguration,
    useFetchEmailSettingsQuery,
} from '../../../gen/gqlClient'
import { SettingsErrorAlert } from '../SettingsErrorAlert'

const formatEmails = (arr?: string[]) => (arr ? arr.join(',') : 'NOT DEFINED')

export const EmailSettingsTable = ({
    type,
    isAdmin,
}: {
    isAdmin: boolean
    type: 'GENERAL' | 'ANALYSTS' | 'SUPPORT'
}): React.ReactElement => {
    const { loading, data, error } = useFetchEmailSettingsQuery()
    const config = data?.fetchEmailSettings.config
    const analysts = data?.fetchEmailSettings.stateAnalysts
    if (isAdmin) return <SettingsErrorAlert isAdmin />
    if (error) return <SettingsErrorAlert error={error} />

    return (
        <>
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
        </>
    )
}

const EmailsGeneralTable = ({ config }: { config: EmailConfiguration }) => {
    console.info('ALL CONFIG', JSON.stringify(config))
    return (
        <>
            <p>
                Shared inboxes receive emails for different submissions, as
                described below.
            </p>
            <Table bordered caption="Automated emails">
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
                        <td>All submissions</td>
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
            <p>
                State analysts email settings. This is currently not connected
                to Users table and is standalone configuration based on the
                state programs spreadsheet.
            </p>
            <Table bordered striped caption="State analyst emails">
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
            <p>
                States that need support should contact one of these // email
                addresses, depending on the issue. States see // these addresses
                in submission-related emails.
            </p>
            <Table bordered caption="Support emails">
                <thead>
                    <tr>
                        <th>Inbox</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{config?.cmsDevTeamHelpEmailAddress}</td>
                        <td>Dev team help email</td>
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
