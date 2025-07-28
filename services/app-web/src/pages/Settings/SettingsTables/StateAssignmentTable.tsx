import {
    Column,
    ColumnFiltersState,
    createColumnHelper,
    FilterFn,
    flexRender,
    getCoreRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
    FilterAccordion,
    FilterOptionType,
    FilterSelect,
    FilterSelectedOptionsType,
} from '../../../components/FilterAccordion'
import { MultiColumnGrid, Loading, RowCellElement } from '../../../components'
import { GridContainer, Table } from '@trussworks/react-uswds'

import styles from '../Settings.module.scss'
import { pluralize } from '@mc-review/common-code'
import { useTealium } from '../../../hooks'
import useDeepCompareEffect from 'use-deep-compare-effect'
import { useOutletContext } from 'react-router-dom'
import { type MCReviewSettingsContextType } from '../Settings'
import { EditLink, formatUserNamesFromUsers } from '../'
import { SettingsErrorAlert } from '../SettingsErrorAlert'
import { getTealiumFiltersChanged } from '../../../tealium/tealiumHelpers'
import { usePage } from '../../../contexts/PageContext'

type AnalystDisplayType = {
    email: string
    givenName?: string
    familyName?: string
}

type StateAnalystsInDashboardType = {
    analysts: AnalystDisplayType[]
    stateCode: string
    stateName: string
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

const analystFilter: FilterFn<AnalystDisplayType[]> = (
    row,
    columnId,
    filterValue: string[]
) => {
    const rowData: AnalystDisplayType[] = row.getValue(columnId)
    const assignedAnalystsEmail: string[] = rowData.map(
        (analyst) => analyst.email
    )

    if (!filterValue || filterValue.length === 0) {
        return true
    }

    if (filterValue.includes('No assignment')) {
        return (
            filterValue.some((filter) =>
                assignedAnalystsEmail.includes(filter)
            ) || assignedAnalystsEmail.length === 0
        )
    }

    return filterValue.some((filter) => assignedAnalystsEmail.includes(filter))
}

const StateAssignmentTable = () => {
    const lastClickedElement = useRef<string | null>(null)
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [prevFilters, setPrevFilters] = useState<{
        filtersForAnalytics: string
        results?: string
    }>({
        filtersForAnalytics: '',
    })
    const { logFilterEvent } = useTealium()
    const { updateActiveMainContent } = usePage()
    const { stateAnalysts: analysts } =
        useOutletContext<MCReviewSettingsContextType>()

    const activeMainContentId = 'stateAssignmentPageMainContent'
    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const tableColumns = useMemo(
        () => [
            columnHelper.accessor('stateCode', {
                id: 'stateCode',
                header: 'State',
                cell: (info) => (
                    <span aria-label={info.row.original.stateName}>
                        {info.getValue()}
                    </span>
                ),
                filterFn: `arrIncludesSome`,
            }),
            columnHelper.accessor('analysts', {
                id: 'analysts',
                header: 'Assigned DMCO staff',
                cell: (info) => formatUserNamesFromUsers(info.getValue()),
                filterFn: 'analystFilter',
            }),
            columnHelper.accessor('editLink', {
                id: 'editLink',
                header: 'Edit state assignment',
                cell: (info) => (
                    <EditLink
                        rowID={info.row.original.stateCode}
                        url={info.getValue()}
                        fieldName={info.row.original.stateName}
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
        // Find the custom filter interface definition in services/app-web/src/types/tanstack-table.d.ts
        filterFns: {
            dateRangeFilter: () => true,
            analystFilter: analystFilter,
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
    const analystsColumn = reactTable.getColumn(
        'analysts'
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

    const emailFilterOptions = (): FilterOptionType[] => {
        const uniqueAnalysts: AnalystDisplayType[] = []
        // Filtering out duplicate analysts by email.
        Array.from(analystsColumn.getFacetedUniqueValues().keys())
            .flat()
            .forEach((currentAnalyst) => {
                const uniqueAnalyst = uniqueAnalysts.find(
                    (analyst: AnalystDisplayType) =>
                        analyst.email === currentAnalyst.email
                )
                if (!uniqueAnalyst) {
                    return uniqueAnalysts.push(currentAnalyst)
                }
            })

        const options: FilterOptionType[] = uniqueAnalysts.map((analyst) => ({
            value: analyst.email,
            label: formatUserNamesFromUsers([analyst]),
        }))

        return options.concat({
            value: 'No assignment',
            label: 'No assignment',
        })
    }

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
                    search_result_count: rowCount,
                    filter_categories_used: filterForAnalytics,
                })
                // If there are filters, then we applied new filters
            } else if (columnFilters.length > 0) {
                logFilterEvent({
                    event_name: 'filters_applied',
                    search_result_count: rowCount,
                    results_count_after_filtering: rowCount,
                    results_count_prior_to_filtering:
                        prevFilters.results ?? 'No prior count, filter on load',
                    filter_categories_used: filterForAnalytics,
                })
            }
            setPrevFilters({
                filtersForAnalytics: filterForAnalytics,
                results: rowCount,
            })
        }
    }, [rowCount, columnFilters, setPrevFilters, prevFilters])

    if (analysts.loading)
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )

    if (analysts.error || !analysts.data)
        return <SettingsErrorAlert error={analysts.error} />

    return (
        <div id={activeMainContentId}>
            <h2>State assignments</h2>
            <p>
                Below is a list of the DMCO staff assigned to states. To edit
                the assigned staff click on the edit link below.
            </p>
            <FilterAccordion
                onClearFilters={clearFilters}
                filterTitle={'Filters'}
            >
                <MultiColumnGrid columns={2}>
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
                        value={getAppliedFilters(columnFilters, 'analysts')}
                        name="analysts"
                        label="Analyst"
                        filterOptions={emailFilterOptions()}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                analystsColumn,
                                selectedOptions,
                                'analysts'
                            )
                        }
                    />
                </MultiColumnGrid>
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
                    {filteredRows.map((row) => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                                // stateCode column must be th for table accessibility with cell associations.
                                <RowCellElement
                                    key={cell.id}
                                    element={
                                        cell.column.id === 'stateCode'
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
            </Table>
        </div>
    )
}
export {
    StateAssignmentTable,
    type StateAnalystsInDashboardType,
    type AnalystDisplayType,
}
