import { GridContainer, Table } from '@trussworks/react-uswds'
import React, { useMemo } from 'react'
import {
    ColumnFiltersState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    RowData,
    useReactTable,
    getFacetedUniqueValues,
    Column,
} from '@tanstack/react-table'
import { useAuth } from '../../contexts/AuthContext'
import { useIndexUsersQuery, IndexUsersQuery } from '../../gen/gqlClient'
import { CmsUser, AdminUser, StateUser } from '../../gen/gqlClient'
import styles from './Settings.module.scss'
import { recordJSException } from '../../otelHelpers/tracingHelper'
import {
    handleApolloError,
    isLikelyUserAuthError,
} from '../../gqlHelpers/apolloErrors'
import {
    ErrorAlertFailedRequest,
    ErrorAlertSignIn,
    Loading,
} from '../../components'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../common-code/featureFlags'

const columnHelper = createColumnHelper<CmsUser>()

export const Settings = (): React.ReactElement => {
    const { loginStatus, loggedInUser } = useAuth()
    const ldClient = useLDClient()
    const { loading, data, error } = useIndexUsersQuery({
        fetchPolicy: 'network-only',
    })
    const isAuthenticated = loginStatus === 'LOGGED_IN'
    const columns = useMemo(
        () => [
            columnHelper.accessor('familyName', {
                cell: (info) => info.getValue(),
                header: () => 'Family Name',
            }),
            columnHelper.accessor('givenName', {
                cell: (info) => info.getValue(),
                header: () => 'Given Name',
            }),
            columnHelper.accessor('email', {
                cell: (info) => info.getValue(),
                header: () => 'Email',
            }),
        ],
        []
    )

    const errorMessage = () => {
        if (error) {
            handleApolloError(error, isAuthenticated)
            if (isLikelyUserAuthError(error, isAuthenticated)) {
                return (
                    <div id="settings-page" className={styles.wrapper}>
                        <GridContainer
                            data-testid="settings-page"
                            className={styles.container}
                        >
                            <ErrorAlertSignIn />
                        </GridContainer>
                    </div>
                )
            } else {
                return (
                    <div id="settings-page" className={styles.wrapper}>
                        <GridContainer
                            data-testid="settings-page"
                            className={styles.container}
                        >
                            <ErrorAlertFailedRequest />
                        </GridContainer>
                    </div>
                )
            }
        }
    }

    const showLoading =
        loginStatus === 'LOADING' || !loggedInUser || loading || !data

    // if (loginStatus === 'LOADING' || !loggedInUser || loading || !data) {
    //     return <Loading />
    // }

    // pick out the part of IndexUsersQuery that specifies Admin/CMS/StateUser
    type UserTypesInIndexQuery = Pick<
        IndexUsersQuery['indexUsers']['edges'][number],
        'node'
    >['node']

    function isCmsUser(obj: UserTypesInIndexQuery): obj is CmsUser {
        return obj.__typename === 'CMSUser'
    }

    const filterForCmsUsers = (
        data: IndexUsersQuery | undefined
    ): CmsUser[] => {
        if (!data) {
            return []
        }
        const cmsUsers = data.indexUsers.edges
            .filter((edge) => isCmsUser(edge.node))
            .map((edge) => edge.node as CmsUser)
        return cmsUsers
    }

    const cmsUsers = filterForCmsUsers(data)

    const table = useReactTable({
        data: cmsUsers,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className={styles.table}>
            {cmsUsers.length ? (
                <Table bordered striped caption="CMS Users">
                    <thead className={styles.header}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef
                                                      .header,
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
            ) : (
                <Loading />
            )}
        </div>
    )
}
