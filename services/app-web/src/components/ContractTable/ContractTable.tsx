import React, { useEffect, useState, useRef } from 'react'
import {
    ColumnFiltersState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
    getFacetedUniqueValues,
    Column,
} from '@tanstack/react-table'
import { useAtom } from 'jotai/react'
import { atomWithHash } from 'jotai-location'
import {
    ConsolidatedContractStatus,
    ContractSubmissionType,
    Program,
    User,
} from '../../gen/gqlClient'
import styles from './ContractTable.module.scss'
import { Table, Tag } from '@trussworks/react-uswds'
import qs from 'qs'
import { SubmissionStatusRecord } from '@mc-review/submissions'
import { SubmissionReviewStatusRecord } from '@mc-review/constants'
import {
    FilterAccordion,
    FilterSelect,
    FilterSelectedOptionsType,
    FilterOptionType,
} from '../FilterAccordion'
import { InfoTag, TagProps } from '../InfoTag/InfoTag'
import { MultiColumnGrid } from '../MultiColumnGrid'
import { NavLinkWithLogging } from '../TealiumLogging'
import { useTealium } from '../../hooks'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { getTealiumFiltersChanged } from '../../tealium/tealiumHelpers'
import {
    pluralize,
    formatContractSubTypeForDisplay,
    featureFlags,
    stateNameToStateCode,
} from '@mc-review/common-code'
import { formatCalendarDate } from '@mc-review/dates'
import { RowCellElement } from '..'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { getSubmissionPath } from '../../routeHelpers'

export type ContractInDashboardType = {
    id: string
    name: string
    submittedAt?: string
    updatedAt: Date
    status: ConsolidatedContractStatus
    programs: Program[]
    contractSubmissionType: ContractSubmissionType
    submissionType?: string
    stateName?: string
}

export type ContractTableProps = {
    tableData: ContractInDashboardType[]
    user: User
    showFilters?: boolean
    caption?: string
}

function submissionURL(
    id: ContractInDashboardType['id'],
    status: ContractInDashboardType['status'],
    contractSubmissionType: ContractInDashboardType['contractSubmissionType'],
    isNotStateUser: boolean
): string {
    if (isNotStateUser) {
        return getSubmissionPath(
            'SUBMISSIONS_SUMMARY',
            contractSubmissionType,
            id
        )
    } else if (status === 'DRAFT') {
        return getSubmissionPath('SUBMISSIONS_TYPE', contractSubmissionType, id)
    } else if (status === 'UNLOCKED') {
        return getSubmissionPath(
            'SUBMISSIONS_REVIEW_SUBMIT',
            contractSubmissionType,
            id
        )
    }
    return getSubmissionPath('SUBMISSIONS_SUMMARY', contractSubmissionType, id)
}

const StatusTag = ({
    status,
    notStateUser,
}: {
    status: ConsolidatedContractStatus
    notStateUser: boolean
}): React.ReactElement => {
    let color: TagProps['color'] = 'gold'
    let emphasize = false
    const isNotSubjectToReview = status === 'NOT_SUBJECT_TO_REVIEW'
    const isSubmittedStatus = status === 'RESUBMITTED' || status === 'SUBMITTED'
    const isApproved = status === 'APPROVED'
    const isWithdrawn = status === 'WITHDRAWN'
    const isUnlocked = status === 'UNLOCKED'
    const isDraft = status === 'DRAFT'
    if (isNotSubjectToReview) {
        color = 'gray-medium'
    } else if (isSubmittedStatus) {
        color = notStateUser ? 'gold' : 'gray'
        emphasize = notStateUser
    } else if (isApproved) {
        color = 'green'
    } else if (isWithdrawn) {
        color = 'gray'
    } else if (isUnlocked) {
        emphasize = true
    } else if (isDraft) {
        emphasize = !notStateUser
    }

    const statusText = isSubmittedStatus
        ? SubmissionStatusRecord['SUBMITTED']
        : isApproved || isWithdrawn || isNotSubjectToReview
          ? SubmissionReviewStatusRecord[status]
          : SubmissionStatusRecord[status]

    return (
        <InfoTag color={color} emphasize={emphasize}>
            {statusText}
        </InfoTag>
    )
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

const submissionStatusOptions = [
    {
        label: 'Approved',
        value: 'APPROVED',
    },
    {
        label: 'Submitted',
        value: 'SUBMITTED',
    },
    {
        label: 'Unlocked',
        value: 'UNLOCKED',
    },
    {
        label: 'Withdrawn',
        value: 'WITHDRAWN',
    },
]

const contractTypeOptions = [
    {
        label: 'EQRO',
        value: 'EQRO',
    },
    {
        label: 'Health plan',
        value: 'HEALTH_PLAN',
    },
]

/* To keep the memoization from being refreshed every time, this needs to be
    created outside the render function */
const columnHelper = createColumnHelper<ContractInDashboardType>()

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
        // Special formatting for selected filters
        .map((item) => {
            if (id === 'contractSubmissionType') {
                return (
                    contractTypeOptions.find(
                        (opt) => opt.value === item.value
                    ) || item
                )
            }

            if (id === 'status') {
                return (
                    submissionStatusOptions.find(
                        (opt) => opt.value === item.value
                    ) || item
                )
            }

            return item
        })
    return filterValues as FilterOptionType[]
}

export const stateFilterFn = (
    row: any,
    columnId: string,
    filterValue: string[]
): boolean => {
    const cellValue = row.getValue(columnId) as string
    return filterValue.includes(cellValue)
}

export const ContractTable = ({
    caption,
    tableData,
    user,
    showFilters = false,
}: ContractTableProps): React.ReactElement => {
    const ldClient = useLDClient()
    const tableConfig = {
        tableName: 'Submissions',
        rowIDName: 'submission',
    }
    const lastClickedElement = useRef<string | null>(null)
    const [columnFilters, setColumnFilters] = useAtom(columnHash)
    const [prevFilters, setPrevFilters] = useState<{
        filtersForAnalytics: string
        results?: string
    }>({
        filtersForAnalytics: '',
    })
    const { logFilterEvent } = useTealium()
    const eqroSubmissions = ldClient?.variation(
        featureFlags.EQRO_SUBMISSIONS.flag,
        featureFlags.EQRO_SUBMISSIONS.defaultValue
    )
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

    const isNotStateUser = user.__typename !== 'StateUser'
    const tableColumns = React.useMemo(
        () => [
            columnHelper.accessor((row) => row, {
                header: 'ID',
                cell: (info) => (
                    <NavLinkWithLogging
                        key={`${tableConfig.rowIDName}-id-${
                            info.getValue().id
                        }`}
                        to={submissionURL(
                            info.getValue().id,
                            info.getValue().status,
                            info.getValue().contractSubmissionType,
                            isNotStateUser
                        )}
                        className={`${styles.ID}`}
                    >
                        {info.getValue().name}
                    </NavLinkWithLogging>
                ),
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-id`,
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
                    dataTestID: `${tableConfig.rowIDName}-stateName`,
                },
                filterFn: stateFilterFn,
            }),
            columnHelper.accessor('contractSubmissionType', {
                id: 'contractSubmissionType',
                header: 'Contract type',
                cell: (info) => (
                    <span>
                        {formatContractSubTypeForDisplay(info.getValue())}
                    </span>
                ),
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-contractType`,
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
                        ? formatCalendarDate(
                              info.getValue(),
                              'America/Los_Angeles'
                          )
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-date`,
                },
            }),
            columnHelper.accessor('updatedAt', {
                header: 'Last updated',
                cell: (info) =>
                    info.getValue()
                        ? formatCalendarDate(
                              info.getValue(),
                              'America/Los_Angeles'
                          )
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-last-updated`,
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
                    dataTestID: `${tableConfig.rowIDName}-status`,
                },
                filterFn: `arrIncludesSome`,
            }),
        ],
        [eqroSubmissions, isNotStateUser, tableConfig.rowIDName]
    )

    const reactTable = useReactTable({
        data: tableData.sort((a, b) =>
            a['updatedAt'] > b['updatedAt'] ? -1 : 1
        ),
        columns: tableColumns,
        filterFns: {
            dateRangeFilter: () => true,
            analystFilter: () => true,
        },
        getCoreRowModel: getCoreRowModel(),
        state: {
            columnFilters,
            columnVisibility: {
                stateName: isNotStateUser,
                submissionType: isNotStateUser,
                contractSubmissionType: eqroSubmissions,
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
    ) as Column<ContractInDashboardType>
    const submissionTypeColumn = reactTable.getColumn(
        'submissionType'
    ) as Column<ContractInDashboardType>
    const statusColumn = reactTable.getColumn(
        'status'
    ) as Column<ContractInDashboardType>
    const contractTypeColumn = reactTable.getColumn(
        'contractSubmissionType'
    ) as Column<ContractInDashboardType>

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
        column: Column<ContractInDashboardType>,
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

    useEffect(() => {
        // if on root route
        if (location.hash === '' && showFilters) {
            updateFilters(
                statusColumn,
                [
                    {
                        label: 'Submitted',
                        value: 'SUBMITTED',
                    },
                    {
                        label: 'Unlocked',
                        value: 'UNLOCKED',
                    },
                ],
                'status'
            )
        }
    }, [showFilters, statusColumn])

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

    // Handles logging when filters change.
    useDeepCompareEffect(() => {
        const prevFiltersForAnalytics = prevFilters.filtersForAnalytics
        const filterForAnalytics = getTealiumFiltersChanged(columnFilters)
        // Any changes in results or filters
        if (
            filterForAnalytics !== prevFiltersForAnalytics ||
            prevFilters.results === undefined
        ) {
            // if current filters is one and previous is more than 1, then it was cleared
            if (
                columnFilters.length === 0 &&
                prevFiltersForAnalytics.length > 0
            ) {
                logFilterEvent({
                    event_name: 'filter_removed',
                    search_result_count: submissionCount,
                    filter_categories_used: filterForAnalytics,
                })
                // If there are filters, then we applied new filters
            } else if (columnFilters.length > 0) {
                logFilterEvent({
                    event_name: 'filters_applied',
                    search_result_count: submissionCount,
                    results_count_after_filtering: submissionCount,
                    results_count_prior_to_filtering:
                        prevFilters.results ?? 'No prior count, filter on load',
                    filter_categories_used: filterForAnalytics,
                })
            }
            setPrevFilters({
                filtersForAnalytics: filterForAnalytics,
                results: submissionCount,
            })
        }
    }, [submissionCount, columnFilters, setPrevFilters, prevFilters])

    return (
        <>
            {tableData.length ? (
                <>
                    {showFilters && (
                        <FilterAccordion
                            onClearFilters={clearFilters}
                            filterTitle="Filters"
                        >
                            <MultiColumnGrid columns={2}>
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
                                {eqroSubmissions ? (
                                    <FilterSelect
                                        value={getSelectedFiltersFromUrl(
                                            columnFilters,
                                            'contractSubmissionType'
                                        )}
                                        name="contractType"
                                        label="Contract type"
                                        filterOptions={contractTypeOptions}
                                        onChange={(selectedOptions) =>
                                            updateFilters(
                                                contractTypeColumn,
                                                selectedOptions,
                                                'contractType'
                                            )
                                        }
                                    />
                                ) : (
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
                                )}
                            </MultiColumnGrid>
                            <MultiColumnGrid columns={2}>
                                <FilterSelect
                                    value={getSelectedFiltersFromUrl(
                                        columnFilters,
                                        'status'
                                    )}
                                    name="status"
                                    label="Status"
                                    filterOptions={submissionStatusOptions}
                                    onChange={(selectedOptions) =>
                                        updateFilters(
                                            statusColumn,
                                            selectedOptions,
                                            'status'
                                        )
                                    }
                                />
                                {eqroSubmissions && (
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
                                )}
                            </MultiColumnGrid>
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
                                        <th
                                            scope="col"
                                            key={header.id}
                                            id={header.id}
                                        >
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
                                        <RowCellElement
                                            key={cell.id}
                                            data-testid={
                                                cell.column.columnDef.meta
                                                    ?.dataTestID
                                            }
                                            element={
                                                cell.column.id === 'ID'
                                                    ? 'th'
                                                    : 'td'
                                            }
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
