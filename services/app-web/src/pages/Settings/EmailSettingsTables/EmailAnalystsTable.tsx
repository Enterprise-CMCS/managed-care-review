import {
    Column,
    ColumnFiltersState,
    createColumnHelper,
    getCoreRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import React, { useMemo, useRef, useState } from 'react'
import {
    FilterSelect,
    FilterSelectedOptionsType,
} from '../../../components/FilterAccordion'
import { DoubleColumnGrid } from '../../../components'
import { formatEmails } from './EmailSettingsTables'
import { Table } from '@trussworks/react-uswds'

import styles from '../Settings.module.scss'
import { pluralize } from '@mc-review/common-code'
import { useTealium } from '../../../hooks'
import useDeepCompareEffect from 'use-deep-compare-effect'

type StateAnalystsInDashboardType = {
    emails: string[]
    stateCode: string
}

const columnHelper = createColumnHelper<StateAnalystsInDashboardType>()

const EmailAnalystsTable = ({
    analysts,
}: {
    analysts: StateAnalystsInDashboardType[]
}) => {
    const lastClickedElement = useRef<string | null>(null)
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [prevFilters, setPrevFilters] = useState<{
        filters: ColumnFiltersState
        results?: string
    }>({
        filters: columnFilters,
    })
    const { logFilterEvent } = useTealium()

    const tableColumns = useMemo(
        () => [
            columnHelper.accessor('stateCode', {
                id: 'stateCode',
                header: 'State',
                cell: (info) => <span>{info.getValue()}</span>,
                filterFn: `arrIncludesSome`,
            }),
            columnHelper.accessor('emails', {
                id: 'emails',
                header: 'Inbox',
                cell: (info) => <span>{info.getValue()}</span>,
                filterFn: `arrIncludesSome`,
            }),
        ],
        []
    )

    const reactTable = useReactTable({
        data: analysts.sort((a, b) =>
            a['stateCode'] > b['stateCode'] ? -1 : 1
        ),
        filterFns: {
            dateRangeFilter: () => true,
        },
        getCoreRowModel: getCoreRowModel(),
        columns: tableColumns,
        state: {
            columnFilters,
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
    const rowCount = `Displaying ${filteredRows.length} of ${analysts.length} ${pluralize(
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

    return (
        <>
            <h2>State Analyst emails</h2>
            <p>
                State analysts email settings. Currently a standalone
                configuration based on the state programs spreadsheet.
            </p>

            <DoubleColumnGrid>
                <FilterSelect
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
                    name="emails"
                    label="Emails"
                    filterOptions={Array.from(
                        emailsColumn.getFacetedUniqueValues().keys()
                    )
                        .sort()
                        .map((state) => ({
                            value: state,
                            label: state,
                        }))}
                    onChange={(selectedOptions) =>
                        updateFilters(emailsColumn, selectedOptions, 'emails')
                    }
                />
            </DoubleColumnGrid>
            <div className={styles.filterCount}>{rowCount}</div>
            <hr />

            <Table bordered>
                <caption className="srOnly">Analyst emails</caption>
                <thead>
                    <tr>
                        <th>State</th>
                        <th>Inbox</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredRows.map((row) => {
                        return (
                            <tr key={row.id}>
                                <td>{row.getValue('stateCode')}</td>
                                <td>
                                    {formatEmails(row.getValue('emails') || [])}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </Table>
        </>
    )
}
export { EmailAnalystsTable, type StateAnalystsInDashboardType }
