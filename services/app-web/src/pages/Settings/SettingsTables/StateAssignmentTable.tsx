import {
    Column,
    ColumnFiltersState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import React, { useMemo, useRef, useState } from 'react'
import {
    FilterAccordion,
    FilterOptionType,
    FilterSelect,
    FilterSelectedOptionsType,
} from '../../../components/FilterAccordion'
import { DoubleColumnGrid, LinkWithLogging, Loading } from '../../../components'
import { Table } from '@trussworks/react-uswds'

import styles from '../Settings.module.scss'
import { pluralize } from '../../../common-code/formatters'
import { useTealium } from '../../../hooks'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { useStringConstants } from '../../../hooks/useStringConstants'
import { useOutletContext } from 'react-router-dom'
import { type MCReviewSettingsContextType } from '../Settings'
import { formatEmails, EditLink } from '../'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'

type StateAnalystsInDashboardType = {
    emails: string[]
    stateCode: string
    editLink: string
}

const columnHelper = createColumnHelper<StateAnalystsInDashboardType>()

const getAppliedFilters = (columnFilters: ColumnFiltersState, id: string) => {
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

const StateAssignmentTable = () => {
    const ldClient = useLDClient()
    const readWriteStateAssignments = ldClient?.variation(
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.flag,
        featureFlags.READ_WRITE_STATE_ASSIGNMENTS.defaultValue
    )

    const lastClickedElement = useRef<string | null>(null)
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [prevFilters, setPrevFilters] = useState<{
        filters: ColumnFiltersState
        results?: string
    }>({
        filters: columnFilters,
    })
    const { logFilterEvent } = useTealium()
    const stringConstants = useStringConstants()
    const MAIL_TO_SUPPORT = stringConstants.MAIL_TO_SUPPORT
    const { stateAnalysts: analysts } =
        useOutletContext<MCReviewSettingsContextType>()

    const tableColumns = useMemo(
        () => [
            columnHelper.accessor('stateCode', {
                id: 'stateCode',
                header: 'State',
                cell: (info) => info.getValue(),
                filterFn: `arrIncludesSome`,
            }),
            columnHelper.accessor('emails', {
                id: 'emails',
                header: 'Assigned DMCO staff',
                cell: (info) => formatEmails(info.getValue()),
                filterFn: `arrIncludesSome`,
            }),
            columnHelper.accessor('editLink', {
                id: 'editLink',
                header: 'Edit state assignment',
                cell: (info) => (
                    <EditLink
                        rowID={info.row.original.stateCode}
                        url={info.getValue()}
                    />
                ),
            }),
        ],
        []
    )

    const reactTable = useReactTable({
        data: analysts.data.sort((a, b) =>
            a['stateCode'] > b['stateCode'] ? 1 : -1
        ),
        filterFns: {
            dateRangeFilter: () => true,
        },
        getCoreRowModel: getCoreRowModel(),
        columns: tableColumns,
        state: {
            columnFilters,
        },
        initialState: {
            columnVisibility: {
                editLink: readWriteStateAssignments,
            },
        },
        onColumnFiltersChange: setColumnFilters,
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const filteredRows = reactTable.getRowModel().rows

    const stateColumn = reactTable.getColumn(
        'stateCode'
    ) as Column<StateAnalystsInDashboardType>
    const emailsColumn = reactTable.getColumn(
        'emails'
    ) as Column<StateAnalystsInDashboardType>
    const rowCount = `Displaying ${filteredRows.length} of ${analysts.data.length} ${pluralize(
        'state',
        filteredRows.length
    )}`
    const updateFilters = (
        column: Column<StateAnalystsInDashboardType>,
        selectedOptions: FilterSelectedOptionsType,
        filterName: string
    ) => {
        lastClickedElement.current = filterName
        column.setFilterValue(
            selectedOptions.map((selection) => selection.value)
        )
    }

    const clearFilters = () => {
        lastClickedElement.current = 'clearFiltersButton'
        reactTable.resetColumnFilters()
    }

    const emailFilterOptions = () => {
        const emails = Array.from(
            emailsColumn.getFacetedUniqueValues().keys()
        ).flat()

        return (
            [...new Set(emails)]
                .map((state) => ({
                    value: state,
                    label: state,
                }))
                // Add just one empty assignment filter with label
                .concat({
                    value: [],
                    label: 'No assignments',
                })
        )
    }

    // Handles logging when filters change.
    useDeepCompareEffect(() => {
        const filterCategories = columnFilters.map((f) => f.id).join(',')
        const prevFilterCategories = prevFilters.filters
            .map((f) => f.id)
            .join(',')
        // Any changes in results or filters
        if (
            filterCategories !== prevFilterCategories ||
            prevFilters.results === undefined
        ) {
            // if current filters is one and previous is more than 1, then it was cleared
            if (columnFilters.length === 0 && prevFilterCategories.length > 0) {
                logFilterEvent({
                    event_name: 'filter_removed',
                    search_result_count: rowCount,
                    filter_categories_used: filterCategories,
                })
                // If there are filters, then we applied new filters
            } else if (columnFilters.length > 0) {
                logFilterEvent({
                    event_name: 'filters_applied',
                    search_result_count: rowCount,
                    results_count_after_filtering: rowCount,
                    results_count_prior_to_filtering:
                        prevFilters.results ?? 'No prior count, filter on load',
                    filter_categories_used: filterCategories,
                })
            }
            setPrevFilters({
                filters: columnFilters,
                results: rowCount,
            })
        }
    }, [rowCount, columnFilters, setPrevFilters, prevFilters])

    if (analysts.loading) return <Loading />

    if (analysts.error || !analysts.data)
        return <SettingsErrorAlert error={analysts.error} />

    return (
        <>
            <h2>State assignments</h2>
            <p>
                Below is a list of the DMCO staff assigned to states. If this
                list is out of date please contact
                <span>
                    <LinkWithLogging
                        href={`mailto: ${MAIL_TO_SUPPORT}`}
                        variant="unstyled"
                        target="_blank"
                        rel="noreferrer"
                    >
                        {' '}
                        {MAIL_TO_SUPPORT}
                    </LinkWithLogging>
                </span>
            </p>
            <FilterAccordion
                onClearFilters={clearFilters}
                filterTitle={'Filters'}
            >
                <DoubleColumnGrid>
                    <FilterSelect
                        value={getAppliedFilters(columnFilters, 'stateCode')}
                        name="state"
                        label="State"
                        filterOptions={Array.from(
                            stateColumn.getFacetedUniqueValues().keys()
                        )
                            .sort()
                            .map((state) => ({
                                value: state,
                                label: state,
                            }))}
                        onChange={(selectedOptions) =>
                            updateFilters(stateColumn, selectedOptions, 'state')
                        }
                    />
                    <FilterSelect
                        value={getAppliedFilters(columnFilters, 'emails')}
                        name="emails"
                        label="Emails"
                        filterOptions={emailFilterOptions()}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                emailsColumn,
                                selectedOptions,
                                'emails'
                            )
                        }
                    />
                </DoubleColumnGrid>
            </FilterAccordion>
            <div aria-live="polite" aria-atomic>
                <div className={styles.filterCount}>{rowCount}</div>
            </div>
            <Table fullWidth bordered>
                <caption className="srOnly">State assignments</caption>
                <thead>
                    {reactTable.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th scope="col" key={header.id}>
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
                    {filteredRows.map((row) => {
                        return (
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
                        )
                    })}
                </tbody>
            </Table>
        </>
    )
}
export { StateAssignmentTable, type StateAnalystsInDashboardType }
