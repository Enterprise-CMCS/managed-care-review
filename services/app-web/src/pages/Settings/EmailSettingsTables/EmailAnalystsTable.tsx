import {
    Column,
    createColumnHelper,
    getCoreRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import { StateAnalystsConfiguration } from '../../../gen/gqlClient'
import { useMemo, useRef } from 'react'
import {
    FilterSelect,
    FilterSelectedOptionsType,
} from '../../../components/FilterAccordion'
import { DoubleColumnGrid } from '../../../components'
import { formatEmails } from './EmailSettingsTables'
import { Table } from '@trussworks/react-uswds'

import styles from '../Settings.module.scss'
import { pluralize } from '../../../common-code/formatters'

const columnHelper = createColumnHelper<StateAnalystsConfiguration>()

const EmailAnalystsTable = ({
    analysts,
}: {
    analysts: StateAnalystsConfiguration[]
}) => {
    const lastClickedElement = useRef<string | null>(null)
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
                header: 'Emails',
                cell: (info) => <span>{info.getValue()}</span>,
                filterFn: `arrIncludesSome`,
            }),
        ],
        []
    )

    const reactTable = useReactTable({
        data: Array.from(analysts).sort((a, b) =>
            a['stateCode'] > b['stateCode'] ? -1 : 1
        ),
        filterFns: {
            dateRangeFilter: () => true,
        },
        getCoreRowModel: getCoreRowModel(),
        columns: tableColumns,
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
    })

    const filteredRows = reactTable.getRowModel().rows

    const stateColumn = reactTable.getColumn(
        'stateCode'
    ) as Column<StateAnalystsConfiguration>
    const emailsColumn = reactTable.getColumn(
        'emails'
    ) as Column<StateAnalystsConfiguration>
    const rowCount = `Displaying ${filteredRows.length} of ${analysts.length} ${pluralize(
        'state',
        filteredRows.length
    )}`
    const updateFilters = (
        column: Column<StateAnalystsConfiguration>,
        selectedOptions: FilterSelectedOptionsType,
        filterName: string
    ) => {
        lastClickedElement.current = filterName
        column.setFilterValue(
            selectedOptions.map((selection) => selection.value)
        )
    }

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
export { EmailAnalystsTable }
