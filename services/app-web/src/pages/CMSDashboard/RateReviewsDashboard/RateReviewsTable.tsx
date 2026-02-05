import React, { useEffect, useState, useRef } from 'react'
import {
    ColumnFiltersState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getFacetedMinMaxValues,
    useReactTable,
    getFacetedUniqueValues,
    Column,
    FilterFn,
} from '@tanstack/react-table'
import { useAtom } from 'jotai/react'
import { atomWithHash } from 'jotai-location'
import {
    HealthPlanPackageStatus,
    Program,
    ConsolidatedRateStatus,
} from '../../../gen/gqlClient'
import styles from '../../../components/ContractTable/ContractTable.module.scss'
import { Table, Tag } from '@trussworks/react-uswds'
import qs from 'qs'
import {
    FilterAccordion,
    FilterSelect,
    FilterSelectedOptionsType,
    FilterOptionType,
    FilterDateRange,
} from '../../../components/FilterAccordion'
import {
    pluralize,
    featureFlags,
    stateNameToStateCode,
} from '@mc-review/common-code'
import { MultiColumnGrid } from '../../../components'
import { FilterDateRangeRef } from '../../../components/FilterAccordion/FilterDateRange/FilterDateRange'
import { NavLinkWithLogging } from '../../../components'
import { useTealium } from '../../../hooks'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { getTealiumFiltersChanged } from '../../../tealium/tealiumHelpers'
import { formatCalendarDate } from '@mc-review/dates'
import { InfoTag, TagProps } from '../../../components/InfoTag/InfoTag'
import { ConsolidatedRateStatusRecord } from '@mc-review/constants'
import { RowCellElement } from '../../../components'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { stateFilterFn } from '../../../components/ContractTable/ContractTable'

type RatingPeriodFilterType = [string, string] | []

export type RateInDashboardType = {
    id: string
    name: string
    rateNumber: number
    submittedAt: string
    updatedAt: Date
    status: HealthPlanPackageStatus
    consolidatedStatus: ConsolidatedRateStatus
    programs: Program[]
    rateType: string
    rateDateStart: Date
    rateDateEnd: Date
    stateName: string
}

export type RateTableProps = {
    tableData: RateInDashboardType[]
    caption?: string
    isAdminUser?: boolean
}

function rateURL(rate: RateInDashboardType): string {
    return `/rates/${rate.id}`
}

const rateTypeOptions = [
    {
        label: 'Certification',
        value: 'Certification',
    },
    {
        label: 'Amendment',
        value: 'Amendment',
    },
]

const rateStatusOptions = [
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

const StatusTag = ({
    status,
}: {
    status: ConsolidatedRateStatus
}): React.ReactElement => {
    let color: TagProps['color'] = 'gold'
    let emphasize = false
    const isSubmittedStatus = status === 'RESUBMITTED' || status === 'SUBMITTED'
    const isUnlocked = status === 'UNLOCKED'
    const isWithdrawn = status === 'WITHDRAWN'
    if (isSubmittedStatus) {
        emphasize = true
    } else if (isUnlocked) {
        emphasize = true
    } else if (isWithdrawn) {
        color = 'gray'
    }

    const statusText = ConsolidatedRateStatusRecord[status]

    return (
        <InfoTag color={color} emphasize={emphasize}>
            {statusText}
        </InfoTag>
    )
}

/* To keep the memoization from being refreshed every time, this needs to be
    created outside the render function */
const columnHelper = createColumnHelper<RateInDashboardType>()

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

const fromReadableUrlToColumnFilters = (input: string): ColumnFiltersState => {
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
const getSelectedFiltersFromColumnState = (
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
            if (id === 'status') {
                return (
                    rateStatusOptions.find((opt) => opt.value === item.value) ||
                    item
                )
            }

            return item
        })

    return filterValues as FilterOptionType[]
}

const getDateRangeFilterFromUrl = (
    columnFilters: ColumnFiltersState,
    id: string
): RatingPeriodFilterType => {
    const filterLookup: { [key: string]: string[] } = {}
    columnFilters.forEach(
        (filter) => (filterLookup[filter.id] = filter.value as string[])
    )

    if (filterLookup[id]) {
        return [filterLookup[id][0], filterLookup[id][1]]
    }

    return ['', '']
}

const dateRangeFilter: FilterFn<RatingPeriodFilterType> = (
    row,
    columnId,
    value: RatingPeriodFilterType
) => {
    if (value.length === 0) {
        return true
    }
    const fromDate = new Date(value[0]).getTime()
    const toDate = new Date(value[1]).getTime()
    const columnDate = new Date(row.getValue(columnId)).getTime()

    const ratingPeriodFilterResults = [
        //If date is greater than rating period TO filter date. Return true if filter date is not valud
        Number.isNaN(fromDate) ? true : columnDate >= fromDate,
        //If date is greater than rating period FROM filter date. Return true if filter date is not valud
        Number.isNaN(toDate) ? true : columnDate <= toDate,
    ]

    return ratingPeriodFilterResults.every((result) => result)
}

type TableVariantConfig = {
    tableName: string
    rowIDName: string
}
export const RateReviewsTable = ({
    caption,
    tableData,
    isAdminUser = false,
}: RateTableProps): React.ReactElement => {
    const ldClient = useLDClient()
    const lastClickedElement = useRef<string | null>(null)
    const filterDateRangeRef = useRef<FilterDateRangeRef>(null)
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

    const tableConfig: TableVariantConfig = {
        tableName: 'Rate Reviews',
        rowIDName: 'rate',
    }

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

    const tableColumns = React.useMemo(
        () => [
            columnHelper.accessor((row) => row, {
                header: 'Rate review',
                cell: (info) => (
                    <NavLinkWithLogging
                        key={`${tableConfig.rowIDName}-id-${
                            info.getValue().id
                        }`}
                        to={rateURL(info.getValue())}
                        className={`${styles.ID}`}
                        data-testid={`rate-link-${info.getValue().id}`}
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
            columnHelper.accessor('rateNumber', {
                id: 'rateNumber',
                header: 'Rate #',
                cell: (info) => <span>{info.getValue()}</span>,
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
            columnHelper.accessor('rateType', {
                id: 'rateType',
                header: 'Rate Type',
                cell: (info) => <span>{info.getValue()}</span>,
                meta: {
                    dataTestID: 'rate-type',
                },
                filterFn: `arrIncludesSome`,
            }),
            columnHelper.accessor('rateDateStart', {
                id: 'rateDateStart',
                header: 'Rate period start date',
                cell: (info) =>
                    info.getValue()
                        ? formatCalendarDate(info.getValue(), 'UTC')
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-date`,
                },
                filterFn: 'dateRangeFilter',
            }),
            columnHelper.accessor('rateDateEnd', {
                id: 'rateDateEnd',
                header: 'Rate period end date',
                cell: (info) =>
                    info.getValue()
                        ? formatCalendarDate(info.getValue(), 'UTC')
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-date`,
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
            columnHelper.accessor('consolidatedStatus', {
                id: 'status',
                header: 'Status',
                cell: (info) => <StatusTag status={info.getValue()} />,
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-status`,
                },
                filterFn: `arrIncludesSome`,
            }),
        ],
        [eqroSubmissions, tableConfig.rowIDName]
    )

    const reactTable = useReactTable({
        data: tableData.sort((a, b) =>
            a['updatedAt'] > b['updatedAt'] ? -1 : 1
        ),
        initialState: {
            columnVisibility: {
                rateNumber: isAdminUser,
            },
        },
        columns: tableColumns,
        // Find the custom filter interface definition in services/app-web/src/types/tanstack-table.d.ts
        filterFns: {
            dateRangeFilter: dateRangeFilter,
            analystFilter: () => true,
        },
        state: {
            columnFilters,
        },
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
    })

    const filteredRows = reactTable.getRowModel().rows
    const hasFilteredRows = filteredRows.length > 0

    const stateColumn = reactTable.getColumn(
        'stateName'
    ) as Column<RateInDashboardType>
    const rateTypeColumn = reactTable.getColumn(
        'rateType'
    ) as Column<RateInDashboardType>
    const rateDateStartColumn = reactTable.getColumn(
        'rateDateStart'
    ) as Column<RateInDashboardType>
    const statusColumn = reactTable.getColumn(
        'status'
    ) as Column<RateInDashboardType>
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

    const submissionCount = `Displaying ${filteredRows.length} of ${
        tableData.length
    } ${pluralize('rate review', tableData.length)}`

    const updateFilters = (
        column: Column<RateInDashboardType>,
        selectedOptions: FilterSelectedOptionsType,
        filterRefName: string
    ) => {
        lastClickedElement.current = filterRefName
        setTableCaption(null)
        column.setFilterValue(
            selectedOptions.map((selection) => selection?.value)
        )
    }

    const updateRatingPeriodFilter = (
        date: [string | undefined, string | undefined],
        filterColumn: Column<RateInDashboardType>,
        elementName: string
    ) => {
        lastClickedElement.current = elementName
        setTableCaption(null)

        filterColumn.setFilterValue(
            (value: RatingPeriodFilterType): RatingPeriodFilterType => {
                const prevDates = value ?? ['', '']
                // When updating, we need to set either the `from` or `to` in that array while preserving the opposite input
                // value to not clear it out.
                // This handles the existing `from` or `to` input date when updating the opposite input. When calling
                // this function, the updated input has a value and the other should be undefined. If both are present,
                // it will set both.
                const fromDate = date[0] ?? prevDates[0]
                const toDate = date[1] ?? prevDates[1]
                const newDates = [fromDate, toDate] as RatingPeriodFilterType

                if (newDates.every((date) => !date)) {
                    return []
                }

                return newDates
            }
        )
    }

    const clearFilters = () => {
        setTableCaption(null)
        setColumnFilters([])
        if (filterDateRangeRef.current) {
            filterDateRangeRef.current.clearFilter()
        }
        lastClickedElement.current = 'clearFiltersButton'
    }

    //Store caption element in state in order for screen readers to read dynamic captions.
    useEffect(() => {
        setTableCaption(
            <caption className={caption ? '' : styles.srOnly}>
                {caption ?? tableConfig.tableName}
                <span className={styles.srOnly}>{`, ${filtersApplied}`}</span>
                <span className={styles.srOnly}>{`, ${submissionCount}.`}</span>
            </caption>
        )
    }, [filtersApplied, submissionCount, caption, tableConfig.tableName])

    useEffect(() => {
        // if on root route
        if (location.hash === '') {
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
    }, [statusColumn])

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
                    <FilterAccordion
                        onClearFilters={clearFilters}
                        filterTitle="Filters"
                    >
                        <MultiColumnGrid columns={2}>
                            <FilterSelect
                                value={getSelectedFiltersFromColumnState(
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
                                value={getSelectedFiltersFromColumnState(
                                    columnFilters,
                                    'rateType'
                                )}
                                name="rateType"
                                label="Rate Type"
                                filterOptions={rateTypeOptions}
                                onChange={(selectedOptions) =>
                                    updateFilters(
                                        rateTypeColumn,
                                        selectedOptions,
                                        'rateType'
                                    )
                                }
                            />
                        </MultiColumnGrid>
                        <FilterDateRange
                            ref={filterDateRangeRef}
                            legend={'Rating period start date'}
                            startDateHint="mm/dd/yyyy"
                            startDateLabel="From"
                            startDatePickerProps={{
                                id: 'ratingPeriodStartFrom',
                                name: 'ratingPeriodStartFrom',
                                defaultValue: getDateRangeFilterFromUrl(
                                    columnFilters,
                                    'rateDateStart'
                                )[0],
                                onChange: (date) =>
                                    updateRatingPeriodFilter(
                                        [date, undefined],
                                        rateDateStartColumn,
                                        'ratingPeriodStartFrom'
                                    ),
                            }}
                            endDateHint="mm/dd/yyyy"
                            endDateLabel="To"
                            endDatePickerProps={{
                                id: 'ratingPeriodStartTo',
                                name: 'ratingPeriodStartTo',
                                defaultValue: getDateRangeFilterFromUrl(
                                    columnFilters,
                                    'rateDateStart'
                                )[1],
                                onChange: (date) =>
                                    updateRatingPeriodFilter(
                                        [undefined, date],
                                        rateDateStartColumn,
                                        'ratingPeriodStartTo'
                                    ),
                            }}
                        />
                        <MultiColumnGrid columns={2}>
                            <FilterSelect
                                value={getSelectedFiltersFromColumnState(
                                    columnFilters,
                                    'status'
                                )}
                                name="status"
                                label="Status"
                                filterOptions={rateStatusOptions}
                                onChange={(selectedOptions) =>
                                    updateFilters(
                                        statusColumn,
                                        selectedOptions,
                                        'status'
                                    )
                                }
                            />
                        </MultiColumnGrid>
                    </FilterAccordion>
                    <div aria-live="polite" aria-atomic>
                        <div className={styles.filterCount}>
                            {filtersApplied}
                        </div>
                        <div className={styles.filterCount}>
                            {submissionCount}
                        </div>
                    </div>
                    <Table fullWidth>
                        <thead data-testid="rate-reviews-table">
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
                                            element={
                                                cell.column.id === 'Rate review'
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
                    data-testid="rate-reviews-table"
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
