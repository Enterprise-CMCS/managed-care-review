import React, { useMemo } from 'react'
import { OauthClient, useFetchOauthClientsQuery } from '../../../gen/gqlClient'
import { Loading } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { Table } from '@trussworks/react-uswds'
import styles from '../Settings.module.scss'
import { wrapApolloResult } from '@mc-review/helpers'

const OauthClientTableWithData = ({
    authClients,
}: {
    authClients: OauthClient[]
}): React.ReactElement => {
    const columns = useMemo(() => {
        const columnHelper = createColumnHelper<OauthClient>()
        return [
            columnHelper.accessor('user.email', {
                id: 'contactEmail',
                cell: (info) => info.getValue(),
                header: 'Contact email',
            }),
            columnHelper.accessor('clientId', {
                id: 'clientId',
                cell: (info) => info.getValue(),
                header: 'Client ID',
            }),
            columnHelper.accessor('clientSecret', {
                id: 'clientSecret',
                cell: (info) => (
                    <div
                        style={{
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                        }}
                    >
                        {info.getValue()}
                    </div>
                ),
                header: 'Client secret',
            }),
            columnHelper.accessor('description', {
                id: 'description',
                cell: (info) => info.getValue(),
                header: 'Description',
            }),
            columnHelper.accessor('grants', {
                id: 'grants',
                cell: (info) => {
                    const grantsArray = info.getValue()

                    return (
                        grantsArray.length && (
                            <div>
                                {grantsArray.map((grant, index) => (
                                    <div key={index}>{grant}</div>
                                ))}
                            </div>
                        )
                    )
                },
                header: 'Grants',
            }),
        ]
    }, [])

    const table = useReactTable({
        data: authClients,
        columns,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {
            dateRangeFilter: () => true,
            analystFilter: () => true,
        },
    })

    return (
        <Table bordered fullWidth className={styles.table}>
            <caption className="srOnly">Oauth clients</caption>
            <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <th key={header.id}>
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                      )}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody>
                {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                            <td key={cell.id}>
                                {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

export const OauthClientsTable = () => {
    const { result: fetchOauthClientsResult } = wrapApolloResult(
        useFetchOauthClientsQuery({
            fetchPolicy: 'cache-and-network',
        })
    )

    if (fetchOauthClientsResult.status === 'LOADING') {
        return <Loading />
    } else if (fetchOauthClientsResult.status === 'ERROR') {
        return <SettingsErrorAlert error={fetchOauthClientsResult.error} />
    } else if (!fetchOauthClientsResult) {
        return <GenericErrorPage />
    }
    const clientsArray: OauthClient[] = [
        ...fetchOauthClientsResult.data.fetchOauthClients.oauthClients,
    ].sort(
        (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    return (
        <>
            <h2>Oauth clients</h2>
            <p>
                The table below lists all Oauth clients and their assigned keys
            </p>
            {clientsArray.length ? (
                <OauthClientTableWithData authClients={clientsArray} />
            ) : (
                <div>
                    <p>No Oauth clients to display</p>
                </div>
            )}
        </>
    )
}
