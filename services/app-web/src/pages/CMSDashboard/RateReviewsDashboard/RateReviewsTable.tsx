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
} from '@tanstack/react-table'
import { useAtom } from 'jotai/react'
import { atomWithHash } from 'jotai-location'
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
} from '../../../components/FilterAccordion'
import { pluralize } from '../../../common-code/formatters'

declare module '@tanstack/table-core' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        dataTestID: string
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
    showFilters?: boolean
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

type TableVariantConfig = {
    tableName: string
    rowIDName: string
}
export const RateReviewsTable = ({
    caption,
    tableData,
    showFilters = false,
}: RateTableProps): React.ReactElement => {
    const lastClickedElement = useRef<string | null>(null)
    const [columnFilters, setColumnFilters] = useAtom(columnHash)
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
                header: 'Rate period start date',
                cell: (info) =>
                    info.getValue()
                        ? dayjs(info.getValue()).format('MM/DD/YYYY')
                        : '',
                meta: {
                    dataTestID: `${tableConfig.rowIDName}-date`,
                },
            }),
            columnHelper.accessor('rateDateEnd', {
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
        state: {
            columnFilters,
        },
        getCoreRowModel: getCoreRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const filteredRows = reactTable.getRowModel().rows
    const hasFilteredRows = filteredRows.length > 0

    const stateColumn = reactTable.getColumn(
        'stateName'
    ) as Column<RateInDashboardType>
    const rateTypeColumn = reactTable.getColumn(
        'rateType'
    ) as Column<RateInDashboardType>

    // Filter options based on table data instead of static list of options.
    const stateFilterOptions = Array.from(
        stateColumn.getFacetedUniqueValues().keys()
    ).map((state) => ({
        value: state,
        label: state,
    }))

    const filterLength = columnFilters.flatMap((filter) => filter.value).length
    const filtersApplied = `${filterLength} ${pluralize(
        'filter',
        filterLength
    )} applied`

    const submissionCount = !showFilters
        ? `${tableData.length} ${pluralize('rate', tableData.length)}`
        : `Displaying ${filteredRows.length} of ${tableData.length} ${pluralize(
              'rate reviews',
              tableData.length
          )}`

    const updateFilters = (
        column: Column<RateInDashboardType>,
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
