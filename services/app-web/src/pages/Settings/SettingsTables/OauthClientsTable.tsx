import React, { useMemo } from 'react'
import { OauthClient, useFetchOauthClientsQuery } from '../../../gen/gqlClient'
import { LinkWithLogging, Loading } from '../../../components'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { Grid, Table } from '@trussworks/react-uswds'
import { wrapApolloResult } from '@mc-review/helpers'
import { RoutesRecord } from '@mc-review/constants'

const OauthClientTable = ({
    authClients,
}: {
    authClients: OauthClient[]
}): React.ReactElement => {
    const columns = useMemo(() => {
        const columnHelper = createColumnHelper<OauthClient>()
        return [
            columnHelper.accessor('clientId', {
                id: 'clientId',
                cell: (info) => info.getValue(),
                header: 'Client ID',
            }),
            columnHelper.accessor('user.email', {
                id: 'contactEmail',
                cell: (info) => info.getValue(),
                header: 'Client email',
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
                cell: (info) => info.getValue().join(', '),
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
        <Table bordered fullWidth>
            <caption className="srOnly">Oauth clients</caption>
            <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <th key={header.id} scope="col">
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

export const OauthClients = () => {
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
            <Grid row gap>
                <Grid col="fill">
                    <p>
                        The table below lists all Oauth clients and their
                        assigned keys
                    </p>
                </Grid>
                <Grid>
                    <LinkWithLogging
                        href={RoutesRecord.CREATE_OAUTH_CLIENT}
                        className="usa-button"
                        variant="unstyled"
                    >
                        Create OAuth client
                    </LinkWithLogging>
                </Grid>
            </Grid>
            {clientsArray.length ? (
                <OauthClientTable authClients={clientsArray} />
            ) : (
                <div>
                    <p>No Oauth clients to display</p>
                </div>
            )}
        </>
    )
}
