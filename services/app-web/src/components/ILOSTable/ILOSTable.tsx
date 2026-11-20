import React from 'react'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { Table } from '@trussworks/react-uswds'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags, stateNameToStateCode } from '@mc-review/common-code'
import { formatCalendarDate } from '@mc-review/dates'
import { ConsolidatedContractStatus, User } from '../../gen/gqlClient'
import { StatusTag, submissionURL } from '../ContractTable'
import { NavLinkWithLogging } from '../TealiumLogging'
import { RowCellElement } from '../Tables'
import styles from '../ContractTable/ContractTable.module.scss'

export type ILOSSubmissionInDashboardType = {
    id: string
    name: string
    stateName: string
    rateDateStart?: Date
    rateDateEnd?: Date
    submittedAt?: string
    status: ConsolidatedContractStatus
}

export type ILOSTableProps = {
    tableData: ILOSSubmissionInDashboardType[]
    user: User
}

const columnHelper = createColumnHelper<ILOSSubmissionInDashboardType>()

const getColumnClassName = (columnId: string): string | undefined => {
    if (columnId === 'ID') {
        return styles.columnID
    }

    if (
        columnId === 'rateDateStart' ||
        columnId === 'rateDateEnd' ||
        columnId === 'submittedAt'
    ) {
        return styles.dateColumn
    }

    if (columnId === 'status') {
        return styles.statusColumn
    }

    return undefined
}

export const ILOSTable = ({
    tableData,
    user,
}: ILOSTableProps): React.ReactElement => {
    const ldClient = useLDClient()
    const eqroSubmissions = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )
    const isNotStateUser = user.__typename !== 'StateUser'

    const tableColumns = React.useMemo(
        () => [
            columnHelper.accessor((row) => row, {
                id: 'ID',
                header: 'ID',
                cell: (info) => (
                    <NavLinkWithLogging
                        to={submissionURL(
                            info.getValue().id,
                            info.getValue().status,
                            'ILOS',
                            isNotStateUser
                        )}
                        className={styles.ID}
                    >
                        {info.getValue().name}
                    </NavLinkWithLogging>
                ),
                meta: {
                    dataTestID: 'ilos-submission-id',
                },
            }),
            columnHelper.accessor('stateName', {
                id: 'stateName',
                header: 'State',
                cell: (info) => (
                    <span>
                        {eqroSubmissions
                            ? stateNameToStateCode(info.getValue())
                            : info.getValue()}
                    </span>
                ),
                meta: {
                    dataTestID: 'ilos-submission-stateName',
                },
            }),
            columnHelper.accessor('rateDateStart', {
                id: 'rateDateStart',
                header: 'Rating period start date',
                cell: (info) =>
                    info.getValue()
                        ? formatCalendarDate(info.getValue(), 'UTC')
                        : '',
                meta: {
                    dataTestID: 'ilos-submission-rate-date-start',
                },
            }),
            columnHelper.accessor('rateDateEnd', {
                id: 'rateDateEnd',
                header: 'Rating period end date',
                cell: (info) =>
                    info.getValue()
                        ? formatCalendarDate(info.getValue(), 'UTC')
                        : '',
                meta: {
                    dataTestID: 'ilos-submission-rate-date-end',
                },
            }),
            columnHelper.accessor('submittedAt', {
                id: 'submittedAt',
                header: 'Submitted on',
                cell: (info) =>
                    info.getValue()
                        ? formatCalendarDate(
                              info.getValue(),
                              'America/Los_Angeles'
                          )
                        : '',
                meta: {
                    dataTestID: 'ilos-submission-date',
                },
            }),
            columnHelper.accessor('status', {
                id: 'status',
                header: 'Status',
                cell: (info) => (
                    <StatusTag
                        status={info.getValue()}
                        notStateUser={isNotStateUser}
                    />
                ),
                meta: {
                    dataTestID: 'ilos-submission-status',
                },
            }),
        ],
        [eqroSubmissions, isNotStateUser]
    )

    const reactTable = useReactTable({
        data: tableData,
        columns: tableColumns,
        // Required by the shared table options type. This table has no filters.
        filterFns: {
            dateRangeFilter: () => true,
            analystFilter: () => true,
        },
        getCoreRowModel: getCoreRowModel(),
        state: {
            columnVisibility: {
                // A state user only sees their own state's ILOS submissions.
                stateName: isNotStateUser,
            },
        },
    })

    if (tableData.length === 0) {
        return (
            <div
                data-testid="ilos-table-empty"
                className={styles.panelEmptyNoSubmissionsYet}
            >
                <h3>You have no ILOS submissions yet</h3>
            </div>
        )
    }

    return (
        <Table fullWidth className={styles.table}>
            <thead>
                {reactTable.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                            <th
                                scope="col"
                                key={header.id}
                                id={header.id}
                                className={getColumnClassName(header.column.id)}
                            >
                                {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                )}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
            <tbody>
                {reactTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} data-testid={`row-${row.original.id}`}>
                        {row.getVisibleCells().map((cell) => (
                            <RowCellElement
                                key={cell.id}
                                data-testid={
                                    cell.column.columnDef.meta?.dataTestID
                                }
                                className={getColumnClassName(cell.column.id)}
                                element={cell.column.id === 'ID' ? 'th' : 'td'}
                            >
                                {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                )}
                            </RowCellElement>
                        ))}
                    </tr>
                ))}
            </tbody>
            <caption className={styles.srOnly}>ILOS submissions</caption>
        </Table>
    )
}
