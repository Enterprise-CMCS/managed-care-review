import React, { useEffect, useState, useRef, useLayoutEffect } from 'react'
import {
    ColumnFiltersState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getSortedRowModel,
    getFacetedMinMaxValues,
    RowData,
    useReactTable,
    getFacetedUniqueValues,
    Column,
    FilterFn,
} from '@tanstack/react-table'
import { useAtom } from 'jotai/react'
import { atom } from 'jotai'
import { atomWithHash } from 'jotai-location'
import { loadable } from 'jotai/vanilla/utils'
import {
    HealthPlanPackageStatus,
    Program,
    RelatedContractRevisions,
} from '../../../gen/gqlClient'
import styles from '../../../components/HealthPlanPackageTable/HealthPlanPackageTable.module.scss'
import { Table, Tag, Link } from '@trussworks/react-uswds'
import { NavLink } from 'react-router-dom'
import dayjs from 'dayjs'
import qs from 'qs'
import {
    FilterAccordion,
    FilterSelect,
    FilterSelectedOptionsType,
    FilterOptionType,
    FilterDateRange,
} from '../../../components/FilterAccordion'
import { pluralize } from '../../../common-code/formatters'
import { DoubleColumnGrid } from '../../../components'
import { FilterDateRangeRef } from '../../../components/FilterAccordion/FilterDateRange/FilterDateRange'
import { Loading } from '../../../components'

type RatingPeriodFilterType = [string, string] | []

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
    submittedAt: string
    updatedAt: Date
    status: HealthPlanPackageStatus
    programs: Program[]
    rateType: string
    rateDateStart: Date
    rateDateEnd: Date
    stateName: string
    contractRevisions: RelatedContractRevisions[]
}

export type RateTableProps = {
    tableData: RateInDashboardType[]
    caption?: string
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

/* This returns the url filters along with a loading status. This is used to prevent flickering on first load with filters
    in the url. */
const loadableColumnHash = loadable(atom(async (get) => get(columnHash)))

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
        .map((item) => ({ value: item.value, label: item.value }))

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
}: RateTableProps): React.ReactElement => {
    const lastClickedElement = useRef<string | null>(null)
    const filterDateRangeRef = useRef<FilterDateRangeRef>(null)
    const [columnFilters, setColumnFilters] = useAtom(columnHash)
    const [defaultFiltersFromUrl] = useAtom(loadableColumnHash)
    const [defaultColumnFilters, setDefaultColumnState] = useState<
        ColumnFiltersState | undefined
    >(undefined)

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
                    <Link
                        key={`${tableConfig.rowIDName}-id-${
                            info.getValue().id
                        }`}
                        asCustom={NavLink}
                        to={rateURL(info.getValue())}
                        className={`${styles.ID}`}
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
                        ? dayjs(info.getValue()).format('MM/DD/YYYY')
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
                        ? dayjs(info.getValue()).format('MM/DD/YYYY')
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-date`,
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
        ],
        [tableConfig.rowIDName]
    )

    const reactTable = useReactTable({
        data: tableData.sort((a, b) =>
            a['updatedAt'] > b['updatedAt'] ? -1 : 1
        ),
        columns: tableColumns,
        filterFns: {
            dateRangeFilter: dateRangeFilter,
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

    useLayoutEffect(() => {
        // Do not set default column state again
        if (
            defaultFiltersFromUrl.state === 'hasData' &&
            !defaultColumnFilters
        ) {
            setDefaultColumnState(defaultFiltersFromUrl.data)
        }
    }, [defaultFiltersFromUrl, defaultColumnFilters])

    if (defaultColumnFilters === undefined) {
        return <Loading />
    }

    return (
        <>
            {tableData.length ? (
                <>
                    <FilterAccordion
                        onClearFilters={clearFilters}
                        filterTitle="Filters"
                    >
                        <DoubleColumnGrid>
                            <FilterSelect
                                value={getSelectedFiltersFromColumnState(
                                    columnFilters,
                                    'stateName'
                                )}
                                defaultValue={getSelectedFiltersFromColumnState(
                                    defaultColumnFilters,
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
                                defaultValue={getSelectedFiltersFromColumnState(
                                    defaultColumnFilters,
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
                        </DoubleColumnGrid>
                        <FilterDateRange
                            ref={filterDateRangeRef}
                            legend={'Rating period start date'}
                            startDateHint="mm/dd/yyyy"
                            startDateLabel="From"
                            startDatePickerProps={{
                                id: 'ratingPeriodStartFrom',
                                name: 'ratingPeriodStartFrom',
                                defaultValue: getDateRangeFilterFromUrl(
                                    defaultColumnFilters,
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
                                    defaultColumnFilters,
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
