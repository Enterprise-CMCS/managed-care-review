import React, { useEffect, useState, useRef } from 'react'
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
    FilterFn,
} from '@tanstack/react-table'
import { useAtom } from 'jotai/react'
import { atomWithHash } from 'jotai-location'
import { HealthPlanPackageStatus, Program, User } from '../../gen/gqlClient'
import styles from './HealthPlanPackageTable.module.scss'
import { Table, Tag, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import dayjs from 'dayjs'
import qs from 'qs'
import { SubmissionStatusRecord } from '../../constants/healthPlanPackages'
import {
    FilterAccordion,
    FilterSelect,
    FilterSelectedOptionsType,
    FilterOptionType,
} from '../FilterAccordion'
import { InfoTag, TagProps } from '../InfoTag/InfoTag'
import { pluralize } from '../../common-code/formatters'
import { DoubleColumnGrid } from '../DoubleColumnGrid'

declare module '@tanstack/table-core' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        dataTestID: string
    }
    interface FilterFns {
        dateRangeFilter: FilterFn<unknown>
    }
}

export type RateInDashboardType = {
    id: string
    name: string
    submittedAt?: string
    updatedAt: Date
    status: HealthPlanPackageStatus
    programs: Program[]
    rateType?: string
    ratePeriodStart: Date
    ratePeriodEnd: Date
    stateName?: string
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

export type PackageTableProps = {
    tableData: PackageInDashboardType[]
    user: User
    showFilters?: boolean
    caption?: string
}

const isSubmitted = (status: HealthPlanPackageStatus) =>
    status === 'SUBMITTED' || status === 'RESUBMITTED'

function submissionURL(
    id: PackageInDashboardType['id'],
    status: PackageInDashboardType['status'],
    isCMSOrAdminUser: boolean
): string {
    if (isCMSOrAdminUser) {
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
    let color: TagProps['color'] = 'gold'
    if (isSubmitted(status)) {
        color = 'green'
    } else if (status === 'UNLOCKED') {
        color = 'blue'
    }

    const statusText = isSubmitted(status)
        ? SubmissionStatusRecord.SUBMITTED
        : SubmissionStatusRecord[status]

    return <InfoTag color={color}>{statusText}</InfoTag>
}

const submissionTypeOptions = [
    {
        label: 'Contract action only',
        value: 'Contract action only',
    },
    {
        label: 'Contract action and rate certification',
        value: 'Contract action and rate certification',
    },
]

/* To keep the memoization from being refreshed every time, this needs to be
    created outside the render function */
const columnHelper = createColumnHelper<PackageInDashboardType>()

type ReadableFilters = {
    [key: string]: string[]
}

const fromColumnFiltersToReadableUrl = (input: ColumnFiltersState) => {
    const output: ReadableFilters = {}
    input.forEach((element) => {
        output[element.id] = element.value as string[]
    })
    return qs.stringify(output, { arrayFormat: 'comma', encode: false })
}

const fromReadableUrlToColumnFilters = (
    input: string | null
): ColumnFiltersState => {
    if (!input) {
        return []
    }
    const parsed = qs.parse(input) as { [key: string]: string }
    return Object.entries(parsed).map(([id, value]) => ({
        id,
        value: value.split(','),
    }))
}

const columnHash = atomWithHash('filters', [] as ColumnFiltersState, {
    serialize: fromColumnFiltersToReadableUrl,
    deserialize: fromReadableUrlToColumnFilters,
})

/* transform react-table's ColumnFilterState (stringified, formatted, and stored in the URL) to react-select's FilterOptionType
    and return only the items matching the FilterSelect component that's calling the function*/
const getSelectedFiltersFromUrl = (
    columnFilters: ColumnFiltersState,
    id: string
) => {
    type TempRecord = { value: string; label: string; id: string }
    const valuesFromUrl = [] as TempRecord[]
    columnFilters.forEach((filter) => {
        if (Array.isArray(filter.value)) {
            filter.value.forEach((value) => {
                valuesFromUrl.push({
                    value: value,
                    label: value,
                    id: filter.id,
                })
            })
        }
    })
    const filterValues = valuesFromUrl
        .filter((item) => item.id === id)
        .map((item) => ({ value: item.value, label: item.value }))
    return filterValues as FilterOptionType[]
}

export const HealthPlanPackageTable = ({
    caption,
    tableData,
    user,
    showFilters = false,
}: PackageTableProps): React.ReactElement => {
    const tableConfig = {
        tableName: 'Submissions',
        rowIDName: 'submission',
    }
    const lastClickedElement = useRef<string | null>(null)
    const [columnFilters, setColumnFilters] = useAtom(columnHash)

    /* we store the last clicked element in a ref so that when the url is updated and the page rerenders
        we can focus that element.  this useEffect (with no dependency array) will run once on each render.
        Note that the React-y way to do this is to use forwardRef, but the clearFilters button is deeply nested
        and we'd wind up passing down the ref through several layers to achieve what we can do here in a few lines
        with DOM methods */
    useEffect(() => {
        const currentValue = lastClickedElement?.current
        if (!currentValue) {
            return
        }
        /* if the last clicked element had a label, it was a react-select component and the label will match our
        naming convention */
        const labels = document.getElementsByTagName('label')
        const labelNames = Array.from(labels).map((item) => item.htmlFor)
        const indexOfLabel = labelNames.indexOf(
            `${currentValue}-filter-select-input`
        )
        if (indexOfLabel > -1) {
            labels[indexOfLabel].focus()
            /* if the last clicked element was NOT a label, then it was the clear filters button, which we can look
            up by id */
        } else {
            const element = document.getElementById(currentValue)
            if (element) {
                element.focus()
            }
        }
        lastClickedElement.current = null
    })

    const [tableCaption, setTableCaption] = useState<React.ReactNode | null>()

    const isCMSOrAdminUser =
        user.__typename === 'CMSUser' || user.__typename === 'AdminUser'
    const tableColumns = React.useMemo(
        () => [
            columnHelper.accessor((row) => row, {
                header: 'ID',
                cell: (info) => (
                    <Link
                        key={`${tableConfig.rowIDName}-id-${
                            info.getValue().id
                        }`}
                        asCustom={NavLink}
                        to={submissionURL(
                            info.getValue().id,
                            info.getValue().status,
                            isCMSOrAdminUser
                        )}
                    >
                        {info.getValue().name}
                    </Link>
                ),
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-id`,
                },
            }),
            columnHelper.accessor('stateName', {
                id: 'stateName',
                header: 'State',
                cell: (info) => <span>{info.getValue()}</span>,
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-stateName`,
                },
                filterFn: `arrIncludesSome`,
            }),
            columnHelper.accessor('submissionType', {
                id: 'submissionType',
                header: 'Submission type',
                cell: (info) => <span>{info.getValue()}</span>,
                meta: {
                    dataTestID: 'submission-type',
                },
                filterFn: `arrIncludesSome`,
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
                    dataTestID: `${tableConfig.rowIDName}-programs`,
                },
            }),
            columnHelper.accessor('submittedAt', {
                header: 'Submission date',
                cell: (info) =>
                    info.getValue()
                        ? dayjs(info.getValue()).format('MM/DD/YYYY')
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-date`,
                },
            }),
            columnHelper.accessor('updatedAt', {
                header: 'Last updated',
                cell: (info) =>
                    info.getValue()
                        ? dayjs(info.getValue()).format('MM/DD/YYYY')
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-last-updated`,
                },
            }),
            columnHelper.accessor('status', {
                header: 'Status',
                cell: (info) => <StatusTag status={info.getValue()} />,
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-status`,
                },
            }),
        ],
        [isCMSOrAdminUser, tableConfig.rowIDName]
    )

    const reactTable = useReactTable({
        data: tableData.sort((a, b) =>
            a['updatedAt'] > b['updatedAt'] ? -1 : 1
        ),
        columns: tableColumns,
        filterFns: {
            dateRangeFilter: () => true,
        },
        getCoreRowModel: getCoreRowModel(),
        state: {
            columnFilters,
            columnVisibility: {
                stateName: isCMSOrAdminUser,
                submissionType: isCMSOrAdminUser,
            },
        },
        onColumnFiltersChange: setColumnFilters,
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const filteredRows = reactTable.getRowModel().rows
    const hasFilteredRows = filteredRows.length > 0

    const stateColumn = reactTable.getColumn(
        'stateName'
    ) as Column<PackageInDashboardType>
    const submissionTypeColumn = reactTable.getColumn(
        'submissionType'
    ) as Column<PackageInDashboardType>

    // Filter options based on table data instead of static list of options.
    const stateFilterOptions = Array.from(
        stateColumn.getFacetedUniqueValues().keys()
    )
        .sort()
        .map((state) => ({
            value: state,
            label: state,
        }))

    const filterLength = columnFilters.flatMap((filter) => filter.value).length
    const filtersApplied = `${filterLength} ${pluralize(
        'filter',
        filterLength
    )} applied`

    const submissionCount = !showFilters
        ? `${tableData.length} ${pluralize('submission', tableData.length)}`
        : `Displaying ${filteredRows.length} of ${tableData.length} ${pluralize(
              'submission',
              tableData.length
          )}`

    const updateFilters = (
        column: Column<PackageInDashboardType>,
        selectedOptions: FilterSelectedOptionsType,
        filterName: string
    ) => {
        lastClickedElement.current = filterName
        setTableCaption(null)
        column.setFilterValue(
            selectedOptions.map((selection) => selection.value)
        )
    }

    const clearFilters = () => {
        lastClickedElement.current = 'clearFiltersButton'
        setTableCaption(null)

        setColumnFilters([])
    }

    //Store caption element in state in order for screen readers to read dynamic captions.
    useEffect(() => {
        setTableCaption(
            <caption className={caption ? '' : styles.srOnly}>
                {caption ?? tableConfig.tableName}
                {showFilters && (
                    <span
                        className={styles.srOnly}
                    >{`, ${filtersApplied}`}</span>
                )}
                <span className={styles.srOnly}>{`, ${submissionCount}.`}</span>
            </caption>
        )
    }, [
        filtersApplied,
        submissionCount,
        caption,
        showFilters,
        tableConfig.tableName,
    ])

    return (
        <>
            {tableData.length ? (
                <>
                    {showFilters && (
                        <FilterAccordion
                            onClearFilters={clearFilters}
                            filterTitle="Filters"
                        >
                            <DoubleColumnGrid>
                                <FilterSelect
                                    value={getSelectedFiltersFromUrl(
                                        columnFilters,
                                        'stateName'
                                    )}
                                    name="state"
                                    label="State"
                                    filterOptions={stateFilterOptions}
                                    onChange={(selectedOptions) =>
                                        updateFilters(
                                            stateColumn,
                                            selectedOptions,
                                            'state'
                                        )
                                    }
                                />
                                <FilterSelect
                                    value={getSelectedFiltersFromUrl(
                                        columnFilters,
                                        'submissionType'
                                    )}
                                    name="submissionType"
                                    label="Submission type"
                                    filterOptions={submissionTypeOptions}
                                    onChange={(selectedOptions) =>
                                        updateFilters(
                                            submissionTypeColumn,
                                            selectedOptions,
                                            'submissionType'
                                        )
                                    }
                                />
                            </DoubleColumnGrid>
                        </FilterAccordion>
                    )}
                    <div aria-live="polite" aria-atomic>
                        {showFilters && (
                            <div className={styles.filterCount}>
                                {filtersApplied}
                            </div>
                        )}
                        <div className={styles.filterCount}>
                            {submissionCount}
                        </div>
                    </div>
                    <Table fullWidth>
                        <thead>
                            {reactTable.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th scope="col" key={header.id}>
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
                            {filteredRows.map((row) => (
                                <tr
                                    key={row.id}
                                    data-testid={`row-${row.original.id}`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            data-testid={
                                                cell.column.columnDef.meta
                                                    ?.dataTestID
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
                        {tableCaption}
                    </Table>
                    {!hasFilteredRows && (
                        <div
                            data-testid="dashboard-table"
                            className={styles.panelEmptyNoFilteredResults}
                        >
                            <h3>No results found</h3>
                            <p>
                                Adjust your filter to find what you are looking
                                for.
                            </p>
                        </div>
                    )}
                </>
            ) : (
                <div
                    data-testid="dashboard-table"
                    className={styles.panelEmptyNoSubmissionsYet}
                >
                    <h3>
                        You have no {tableConfig.tableName.toLowerCase()} yet
                    </h3>
                </div>
            )}
        </>
    )
}
