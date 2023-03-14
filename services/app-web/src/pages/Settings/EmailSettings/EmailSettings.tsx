import { Table } from '@trussworks/react-uswds'
import React from 'react'
import { Loading } from '../../../components'
import { useFetchEmailSettingsQuery } from '../../../gen/gqlClient'

export const EmailSettings = (): React.ReactElement => {
    const { loading, data, error } = useFetchEmailSettingsQuery()
    const config = data?.fetchEmailSettings.config
    console.info('ALL CONFIG', JSON.stringify(config))

    const formatEmails = (arr?: string[]) =>
        arr ? arr.join(',') : 'NOT DEFINED'
    return (
        <>
            {loading && <Loading />}
            {error && <p>An Error has occurred</p>}
            {data && (
                <Table bordered striped caption="Email Settings">
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
            )}
        </>
    )
}
