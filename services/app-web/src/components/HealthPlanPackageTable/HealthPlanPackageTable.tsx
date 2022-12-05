import React, { useLayoutEffect } from 'react'
import {
    //ColumnFiltersState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    RowData,
    useReactTable,
} from '@tanstack/react-table'
import { HealthPlanPackageStatus, Program } from '../../gen/gqlClient'
import styles from '../../pages/StateDashboard/StateDashboard.module.scss'
import { Table, Tag } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import dayjs from 'dayjs'
import classnames from 'classnames'
import { SubmissionStatusRecord } from '../../constants/healthPlanPackages'

declare module '@tanstack/table-core' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        dataTestID: string
    }
}

export type PackageInDashboardType = {
    id: string
    name: string
    submittedAt?: string
    updatedAt: Date
    status: HealthPlanPackageStatus
    programs: Program[]
    submissionType?: string
    stateName?: string
}

type UserType = 'STATE' | 'CMS'

export type PackageTableProps = {
    tableData: PackageInDashboardType[]
    userType: UserType
}

const isSubmitted = (status: HealthPlanPackageStatus) =>
    status === 'SUBMITTED' || status === 'RESUBMITTED'

function submissionURL(
    id: PackageInDashboardType['id'],
    status: PackageInDashboardType['status'],
    userType: UserType
): string {
    if (userType === 'CMS') {
        return `/submissions/${id}`
    } else if (status === 'DRAFT') {
        return `/submissions/${id}/edit/type`
    } else if (status === 'UNLOCKED') {
        return `/submissions/${id}/edit/review-and-submit`
    }
    return `/submissions/${id}`
}

const StatusTag = ({
    status,
}: {
    status: HealthPlanPackageStatus
}): React.ReactElement => {
    const tagStyles = classnames('', {
        [styles.submittedTag]: isSubmitted(status),
        [styles.draftTag]: status === 'DRAFT',
        [styles.unlockedTag]: status === 'UNLOCKED',
    })

    const statusText = isSubmitted(status)
        ? SubmissionStatusRecord.SUBMITTED
        : SubmissionStatusRecord[status]

    return <Tag className={tagStyles}>{statusText}</Tag>
}

export const HealthPlanPackageTable = ({
    tableData,
    userType,
}: PackageTableProps): React.ReactElement => {
    // const [globalFilter, setGlobalFilter] = React.useState('')
    // const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const columnHelper = createColumnHelper<PackageInDashboardType>()

    const tableColumns = [
        columnHelper.accessor((row) => row, {
            header: 'ID',
            cell: (info) => (
                <NavLink
                    to={submissionURL(
                        info.getValue().id,
                        info.getValue().status,
                        userType
                    )}
                >
                    {info.getValue().name}
                </NavLink>
            ),
            meta: {
                dataTestID: 'submission-id',
            },
        }),
        columnHelper.accessor('stateName', {
            header: 'State',
            cell: (info) => <span>{info.getValue()}</span>,
            meta: {
                dataTestID: 'submission-stateName',
            },
        }),
        columnHelper.accessor('submissionType', {
            header: 'Submission type',
            cell: (info) => <span>{info.getValue()}</span>,
            meta: {
                dataTestID: 'submission-type',
            },
        }),
        columnHelper.accessor('programs', {
            header: 'Programs',
            cell: (info) =>
                info.getValue().map((program) => {
                    return (
                        <Tag
                            data-testid="program-tag"
                            key={program.id}
                            className={`radius-pill ${styles.programTag}`}
                        >
                            {program.name}
                        </Tag>
                    )
                }),
            meta: {
                dataTestID: 'submission-programs',
            },
        }),
        columnHelper.accessor('submittedAt', {
            header: 'Submission date',
            cell: (info) =>
                info.getValue()
                    ? dayjs(info.getValue()).format('MM/DD/YYYY')
                    : '',
            meta: {
                dataTestID: 'submission-date',
            },
        }),
        columnHelper.accessor('updatedAt', {
            header: 'Last updated',
            cell: (info) =>
                info.getValue()
                    ? dayjs(info.getValue()).format('MM/DD/YYYY')
                    : '',
            meta: {
                dataTestID: 'submission-last-updated',
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: (info) => <StatusTag status={info.getValue()} />,
            meta: {
                dataTestID: 'submission-status',
            },
        }),
    ]

    const reactTable = useReactTable({
        data:
            tableData.sort((a, b) =>
                a['updatedAt'] > b['updatedAt'] ? -1 : 1
            ) || [],
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        // state: {
        //     columnFilters,
        //     globalFilter
        // }
    })

    useLayoutEffect(() => {
        if (userType === 'STATE') {
            reactTable.getColumn('submissionType').toggleVisibility(false)
            reactTable.getColumn('stateName').toggleVisibility(false)
        }
    }, [userType, reactTable])

    return tableData.length ? (
        <Table fullWidth>
            <thead>
                {reactTable.getHeaderGroups().map((headerGroup) => (
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
                {reactTable.getRowModel().rows.map((row) => (
                    <tr key={row.id} data-testid={`row-${row.original.id}`}>
                        {row.getVisibleCells().map((cell) => (
                            <td
                                key={cell.id}
                                data-testid={
                                    cell.column.columnDef.meta?.dataTestID
                                }
                            >
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
        <div data-testid="dashboard-table" className={styles.panelEmpty}>
            <h3>You have no submissions yet</h3>
        </div>
    )
}
