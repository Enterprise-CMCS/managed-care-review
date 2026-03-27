import React, { useRef } from 'react'
import {
    ColumnFiltersState,
    PaginationState,
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getFacetedUniqueValues,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
    Column,
    FilterFn,
    Table as TanstackTable,
} from '@tanstack/react-table'
import { Accordion, Button, Table, Tag } from '@trussworks/react-uswds'
import type { AccordionItemProps } from '@trussworks/react-uswds/lib/components/Accordion/Accordion'
import { FlattenContract } from '../../../gen/gqlClient'
import { findStatePrograms, ProgramArgType } from '@mc-review/submissions'
import styles from '../../../components/ContractTable/ContractTable.module.scss'
import { pluralize } from '@mc-review/common-code'
import {
    FilterAccordion,
    FilterSelect,
    FilterSelectedOptionsType,
    FilterOptionType,
    FilterDateRange,
} from '../../../components/FilterAccordion'
import { FilterDateRangeRef } from '../../../components/FilterAccordion/FilterDateRange/FilterDateRange'
import { MultiColumnGrid } from '../../../components'
import { useVirtualizer } from '@tanstack/react-virtual'
import virtualStyles from './AdminSubmissionsTable.module.scss'

const ROW_HEIGHT_ESTIMATE = 36

const columnHelper = createColumnHelper<FlattenContract>()

const formatDate = (value: string | null | undefined): string => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString()
}

const formatBool = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return '-'
    return value ? 'Yes' : 'No'
}

const contractSubmissionTypeOptions: FilterOptionType[] = [
    { label: 'Health Plan', value: 'HEALTH_PLAN' },
    { label: 'EQRO', value: 'EQRO' },
]

const statusOptions: FilterOptionType[] = [
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Resubmitted', value: 'RESUBMITTED' },
    { label: 'Unlocked', value: 'UNLOCKED' },
]

const reviewStatusOptions: FilterOptionType[] = [
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Not Subject to Review', value: 'NOT_SUBJECT_TO_REVIEW' },
    { label: 'Withdrawn', value: 'WITHDRAWN' },
]

const consolidatedStatusOptions: FilterOptionType[] = [
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Resubmitted', value: 'RESUBMITTED' },
    { label: 'Unlocked', value: 'UNLOCKED' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Not Subject to Review', value: 'NOT_SUBJECT_TO_REVIEW' },
    { label: 'Withdrawn', value: 'WITHDRAWN' },
]

const submissionTypeOptions: FilterOptionType[] = [
    { label: 'Contract and Rates', value: 'CONTRACT_AND_RATES' },
    { label: 'Contract Only', value: 'CONTRACT_ONLY' },
]

const contractTypeOptions: FilterOptionType[] = [
    { label: 'Base', value: 'BASE' },
    { label: 'Amendment', value: 'AMENDMENT' },
]

const populationCoveredOptions: FilterOptionType[] = [
    { label: 'Medicaid', value: 'MEDICAID' },
    { label: 'CHIP', value: 'CHIP' },
    { label: 'Medicaid and CHIP', value: 'MEDICAID_AND_CHIP' },
]

const contractExecutionStatusOptions: FilterOptionType[] = [
    { label: 'Executed', value: 'EXECUTED' },
    { label: 'Unexecuted', value: 'UNEXECUTED' },
]

type DateRangeFilterType = [string, string] | []

const dateRangeFilter: FilterFn<DateRangeFilterType> = (
    row,
    columnId,
    value: DateRangeFilterType
) => {
    if (value.length === 0) return true
    const fromDate = new Date(value[0]).getTime()
    const toDate = new Date(value[1]).getTime()
    const columnDate = new Date(row.getValue(columnId)).getTime()
    return (
        (Number.isNaN(fromDate) || columnDate >= fromDate) &&
        (Number.isNaN(toDate) || columnDate <= toDate)
    )
}

const columns = [
    // Identifiers
    columnHelper.accessor('submissionID', {
        header: 'Submission ID',
        size: 155,
    }),
    columnHelper.accessor('contractId', { header: 'Contract ID' }),
    columnHelper.accessor('stateCode', {
        id: 'stateCode',
        header: 'State',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('stateNumber', { header: 'State #' }),
    columnHelper.accessor('contractSubmissionType', {
        id: 'contractSubmissionType',
        header: 'Contract Submission Type',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('mccrsID', {
        header: 'MCCRS ID',
        cell: (info) => info.getValue() ?? '-',
    }),

    // Statuses
    columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('reviewStatus', {
        id: 'reviewStatus',
        header: 'Review Status',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('consolidatedStatus', {
        id: 'consolidatedStatus',
        header: 'Consolidated Status',
        filterFn: 'arrIncludesSome',
    }),

    // Contract dates
    columnHelper.accessor('contractCreatedAt', {
        id: 'contractCreatedAt',
        header: 'Contract Created',
        cell: (info) => formatDate(info.getValue()),
        filterFn: 'dateRangeFilter',
    }),
    columnHelper.accessor('contractUpdatedAt', {
        header: 'Contract Updated',
        cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('initiallySubmittedAt', {
        header: 'Initially Submitted',
        cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('lastUpdatedForDisplay', {
        header: 'Last Updated',
        cell: (info) => formatDate(info.getValue()),
    }),

    // Revision info
    columnHelper.accessor('revisionId', { header: 'Revision ID' }),
    columnHelper.accessor('revisionCreatedAt', {
        header: 'Revision Created',
        cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('revisionUpdatedAt', {
        header: 'Revision Updated',
        cell: (info) => formatDate(info.getValue()),
    }),

    // Submit info
    columnHelper.accessor('submitInfoUpdatedAt', {
        header: 'Submit Updated At',
        cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('submitInfoUpdatedByRole', {
        header: 'Submit By Role',
        cell: (info) => info.getValue() ?? '-',
    }),
    columnHelper.accessor('submitInfoUpdatedByEmail', {
        header: 'Submit By Email',
        cell: (info) => info.getValue() ?? '-',
    }),
    columnHelper.accessor('submitInfoUpdatedByGivenName', {
        header: 'Submit By Given Name',
        cell: (info) => info.getValue() ?? '-',
    }),
    columnHelper.accessor('submitInfoUpdatedByFamilyName', {
        header: 'Submit By Family Name',
        cell: (info) => info.getValue() ?? '-',
    }),

    // Unlock info
    columnHelper.accessor('unlockInfoUpdatedAt', {
        header: 'Unlock Updated At',
        cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('unlockInfoUpdatedByRole', {
        header: 'Unlock By Role',
        cell: (info) => info.getValue() ?? '-',
    }),
    columnHelper.accessor('unlockInfoUpdatedByEmail', {
        header: 'Unlock By Email',
        cell: (info) => info.getValue() ?? '-',
    }),
    columnHelper.accessor('unlockInfoUpdatedByGivenName', {
        header: 'Unlock By Given Name',
        cell: (info) => info.getValue() ?? '-',
    }),
    columnHelper.accessor('unlockInfoUpdatedByFamilyName', {
        header: 'Unlock By Family Name',
        cell: (info) => info.getValue() ?? '-',
    }),

    // Form data
    columnHelper.accessor('programIDs', {
        header: 'Programs',
        cell: (info) => {
            const programIDs = info.getValue()
            const stateCode = info.row.original.stateCode
            const programsByState = info.table.options.meta?.programsByState as
                | Map<string, ProgramArgType[]>
                | undefined
            const statePrograms = programsByState?.get(stateCode) ?? []
            const programs = statePrograms.filter((p) =>
                programIDs.includes(p.id)
            )
            return programs.map((program) => (
                <Tag
                    key={program.id}
                    className={`radius-pill ${styles.programTag}`}
                >
                    {program.name}
                </Tag>
            ))
        },
    }),
    columnHelper.accessor('submissionType', {
        id: 'submissionType',
        header: 'Submission Type',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('contractType', {
        id: 'contractType',
        header: 'Contract Type',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('populationCovered', {
        id: 'populationCovered',
        header: 'Population Covered',
        cell: (info) => info.getValue() ?? '-',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('riskBasedContract', {
        header: 'Risk Based',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('dsnpContract', {
        header: 'DSNP',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('contractExecutionStatus', {
        id: 'contractExecutionStatus',
        header: 'Execution Status',
        cell: (info) => info.getValue() ?? '-',
        filterFn: 'arrIncludesSome',
    }),
    columnHelper.accessor('contractDateStart', {
        header: 'Contract Start',
        cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('contractDateEnd', {
        header: 'Contract End',
        cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('managedCareEntities', {
        header: 'Managed Care Entities',
        cell: (info) => info.getValue()?.join(', ') ?? '-',
    }),
    columnHelper.accessor('federalAuthorities', {
        header: 'Federal Authorities',
        cell: (info) => info.getValue()?.join(', ') ?? '-',
    }),
    columnHelper.accessor('inLieuServicesAndSettings', {
        header: 'In Lieu Services',
        cell: (info) => formatBool(info.getValue()),
    }),

    // Modified provisions
    columnHelper.accessor('modifiedBenefitsProvided', {
        header: 'Mod Benefits Provided',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedGeoAreaServed', {
        header: 'Mod Geo Area',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedMedicaidBeneficiaries', {
        header: 'Mod Medicaid Beneficiaries',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedRiskSharingStrategy', {
        header: 'Mod Risk Sharing',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedIncentiveArrangements', {
        header: 'Mod Incentive Arrangements',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedWitholdAgreements', {
        header: 'Mod Withhold Agreements',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedStateDirectedPayments', {
        header: 'Mod State Directed Payments',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedPassThroughPayments', {
        header: 'Mod Pass Through Payments',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedPaymentsForMentalDiseaseInstitutions', {
        header: 'Mod Mental Disease Inst',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedMedicalLossRatioStandards', {
        header: 'Mod Medical Loss Ratio',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedOtherFinancialPaymentIncentive', {
        header: 'Mod Other Financial',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedEnrollmentProcess', {
        header: 'Mod Enrollment Process',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedGrevienceAndAppeal', {
        header: 'Mod Grievance & Appeal',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedNetworkAdequacyStandards', {
        header: 'Mod Network Adequacy',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedLengthOfContract', {
        header: 'Mod Length of Contract',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('modifiedNonRiskPaymentArrangements', {
        header: 'Mod Non-Risk Payment',
        cell: (info) => formatBool(info.getValue()),
    }),

    // Statutory attestation
    columnHelper.accessor('statutoryRegulatoryAttestation', {
        header: 'Statutory Attestation',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('statutoryRegulatoryAttestationDescription', {
        header: 'Attestation Description',
        cell: (info) => info.getValue() ?? '-',
    }),

    // EQRO
    columnHelper.accessor('eqroNewContractor', {
        header: 'EQRO New Contractor',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('eqroProvisionMcoNewOptionalActivity', {
        header: 'EQRO MCO New Optional',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('eqroProvisionNewMcoEqrRelatedActivities', {
        header: 'EQRO New MCO EQR',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('eqroProvisionChipEqrRelatedActivities', {
        header: 'EQRO CHIP EQR',
        cell: (info) => formatBool(info.getValue()),
    }),
    columnHelper.accessor('eqroProvisionMcoEqrOrRelatedActivities', {
        header: 'EQRO MCO EQR/Related',
        cell: (info) => formatBool(info.getValue()),
    }),
]

const ColumnVisibilityAccordion = ({
    table,
}: {
    table: TanstackTable<FlattenContract>
}): React.ReactElement => {
    const accordionItems: AccordionItemProps[] = [
        {
            title: 'Show/Hide Columns',
            headingLevel: 'h4',
            content: (
                <>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns:
                                'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: '0.5rem',
                        }}
                    >
                        {table.getAllLeafColumns().map((column) => (
                            <label
                                key={column.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    cursor: 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={column.getIsVisible()}
                                    onChange={column.getToggleVisibilityHandler()}
                                />
                                {typeof column.columnDef.header === 'string'
                                    ? column.columnDef.header
                                    : column.id}
                            </label>
                        ))}
                    </div>
                    <div className={virtualStyles.columnVisibilityActions}>
                        <button
                            type="button"
                            className={
                                virtualStyles.columnVisibilityActionButton
                            }
                            onClick={() => table.toggleAllColumnsVisible(true)}
                        >
                            Show all
                        </button>
                        <button
                            type="button"
                            className={
                                virtualStyles.columnVisibilityActionButton
                            }
                            onClick={() => table.toggleAllColumnsVisible(false)}
                        >
                            Hide all
                        </button>
                    </div>
                </>
            ),
            expanded: false,
            id: 'columnVisibilityAccordion',
        },
    ]

    return (
        <Accordion
            items={accordionItems}
            className={virtualStyles.columnVisibilityAccordion}
        />
    )
}

type AdminSubmissionsTableProps = {
    data: FlattenContract[]
}

export const AdminSubmissionsTable = ({
    data,
}: AdminSubmissionsTableProps): React.ReactElement => {
    const tableContainerRef = useRef<HTMLDivElement>(null)
    const filterDateRangeRef = useRef<FilterDateRangeRef>(null)
    const [sorting, setSorting] = React.useState<SortingState>([
        { id: 'lastUpdatedForDisplay', desc: true },
    ])
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([])
    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 150,
    })

    const programsByState = React.useMemo(() => {
        const map = new Map<string, ProgramArgType[]>()
        const stateCodes = new Set(data.map((d) => d.stateCode))
        for (const code of stateCodes) {
            map.set(code, findStatePrograms(code))
        }
        return map
    }, [data])

    const table = useReactTable({
        data,
        columns,
        defaultColumn: {
            size: 150,
            minSize: 80,
        },
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        meta: { programsByState },
        filterFns: {
            dateRangeFilter: dateRangeFilter,
            analystFilter: () => true,
        },
        state: { sorting, columnFilters, pagination },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    })

    const paginatedRows = table.getRowModel().rows
    const totalFilteredRows = table.getFilteredRowModel().rows.length
    const filterLength = columnFilters.flatMap((filter) => filter.value).length
    const isShowingAll = pagination.pageSize >= data.length

    const rowVirtualizer = useVirtualizer({
        count: paginatedRows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => ROW_HEIGHT_ESTIMATE,
        overscan: 20,
    })

    React.useEffect(() => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = 0
        }
    }, [pagination.pageIndex, pagination.pageSize, columnFilters, sorting])

    // Build dynamic state filter options from data
    const stateColumn = table.getColumn('stateCode') as Column<FlattenContract>
    const stateFilterOptions = Array.from(
        stateColumn.getFacetedUniqueValues().keys()
    )
        .sort()
        .map((state) => ({ value: state, label: state }))

    const getSelectedFilters = (
        id: string,
        optionsList?: FilterOptionType[]
    ): FilterOptionType[] => {
        const filter = columnFilters.find((f) => f.id === id)
        if (!filter || !Array.isArray(filter.value)) return []
        return (filter.value as string[]).map((v) => {
            if (optionsList) {
                const option = optionsList.find((o) => o.value === v)
                if (option) return option
            }
            return { label: v, value: v }
        })
    }

    const updateFilters = (
        column: Column<FlattenContract>,
        selectedOptions: FilterSelectedOptionsType
    ) => {
        column.setFilterValue(
            selectedOptions.map((selection) => selection?.value)
        )
    }

    const updateDateRangeFilter = (
        date: [string | undefined, string | undefined],
        filterColumn: Column<FlattenContract>
    ) => {
        filterColumn.setFilterValue(
            (value: DateRangeFilterType): DateRangeFilterType => {
                const prevDates = value ?? ['', '']
                const fromDate = date[0] ?? prevDates[0]
                const toDate = date[1] ?? prevDates[1]
                const newDates = [fromDate, toDate] as DateRangeFilterType
                if (newDates.every((d) => !d)) return []
                return newDates
            }
        )
    }

    const contractCreatedAtColumn = table.getColumn(
        'contractCreatedAt'
    ) as Column<FlattenContract>

    const clearFilters = () => {
        setColumnFilters([])
        if (filterDateRangeRef.current) {
            filterDateRangeRef.current.clearFilter()
        }
    }

    if (data.length === 0) {
        return (
            <div
                data-testid="admin-submissions-table"
                className={styles.panelEmptyNoSubmissionsYet}
            >
                <h3>You have no submissions yet</h3>
            </div>
        )
    }

    return (
        <>
            <FilterAccordion
                onClearFilters={clearFilters}
                filterTitle="Filters"
            >
                <MultiColumnGrid columns={3}>
                    <FilterSelect
                        value={getSelectedFilters('stateCode')}
                        name="stateCode"
                        label="State"
                        filterOptions={stateFilterOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(stateColumn, selectedOptions)
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters(
                            'contractSubmissionType',
                            contractSubmissionTypeOptions
                        )}
                        name="contractSubmissionType"
                        label="Contract Submission Type"
                        filterOptions={contractSubmissionTypeOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'contractSubmissionType'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters('status', statusOptions)}
                        name="status"
                        label="Status"
                        filterOptions={statusOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'status'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters(
                            'reviewStatus',
                            reviewStatusOptions
                        )}
                        name="reviewStatus"
                        label="Review Status"
                        filterOptions={reviewStatusOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'reviewStatus'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters(
                            'consolidatedStatus',
                            consolidatedStatusOptions
                        )}
                        name="consolidatedStatus"
                        label="Consolidated Status"
                        filterOptions={consolidatedStatusOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'consolidatedStatus'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters(
                            'submissionType',
                            submissionTypeOptions
                        )}
                        name="submissionType"
                        label="Submission Type"
                        filterOptions={submissionTypeOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'submissionType'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters(
                            'contractType',
                            contractTypeOptions
                        )}
                        name="contractType"
                        label="Contract Type"
                        filterOptions={contractTypeOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'contractType'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters(
                            'populationCovered',
                            populationCoveredOptions
                        )}
                        name="populationCovered"
                        label="Population Covered"
                        filterOptions={populationCoveredOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'populationCovered'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                    <FilterSelect
                        value={getSelectedFilters(
                            'contractExecutionStatus',
                            contractExecutionStatusOptions
                        )}
                        name="contractExecutionStatus"
                        label="Execution Status"
                        filterOptions={contractExecutionStatusOptions}
                        onChange={(selectedOptions) =>
                            updateFilters(
                                table.getColumn(
                                    'contractExecutionStatus'
                                ) as Column<FlattenContract>,
                                selectedOptions
                            )
                        }
                    />
                </MultiColumnGrid>
                <FilterDateRange
                    ref={filterDateRangeRef}
                    legend="Contract created date"
                    startDateHint="mm/dd/yyyy"
                    startDateLabel="From"
                    startDatePickerProps={{
                        id: 'contractCreatedFrom',
                        name: 'contractCreatedFrom',
                        onChange: (date) =>
                            updateDateRangeFilter(
                                [date, undefined],
                                contractCreatedAtColumn
                            ),
                    }}
                    endDateHint="mm/dd/yyyy"
                    endDateLabel="To"
                    endDatePickerProps={{
                        id: 'contractCreatedTo',
                        name: 'contractCreatedTo',
                        onChange: (date) =>
                            updateDateRangeFilter(
                                [undefined, date],
                                contractCreatedAtColumn
                            ),
                    }}
                />
            </FilterAccordion>
            <ColumnVisibilityAccordion table={table} />
            <div aria-live="polite" aria-atomic>
                <div
                    className={styles.filterCount}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <span>
                        {filterLength} {pluralize('filter', filterLength)}{' '}
                        applied — Displaying {paginatedRows.length} of{' '}
                        {totalFilteredRows}{' '}
                        {pluralize('submission', totalFilteredRows)}
                        {totalFilteredRows !== data.length &&
                            ` (${data.length} total)`}
                    </span>
                    <span
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <label htmlFor="page-size-select">Rows per page:</label>
                        <select
                            id="page-size-select"
                            value={isShowingAll ? 'all' : pagination.pageSize}
                            onChange={(e) => {
                                const val = e.target.value
                                if (val === 'all') {
                                    table.setPageSize(data.length + 1)
                                } else {
                                    table.setPageSize(Number(val))
                                }
                                table.setPageIndex(0)
                            }}
                            className="usa-select"
                            style={{ width: 'auto', margin: 0 }}
                        >
                            {[50, 100, 150, 250, 500].map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                            <option value="all">All</option>
                        </select>
                    </span>
                </div>
            </div>
            <div
                ref={tableContainerRef}
                style={{
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: '70vh',
                }}
            >
                <Table
                    fullWidth
                    bordered
                    className={virtualStyles.virtualizedTable}
                >
                    <thead className={virtualStyles.stickyThead}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr
                                key={headerGroup.id}
                                className={virtualStyles.theadRow}
                            >
                                {headerGroup.headers.map(
                                    (header, headerIndex) => (
                                        <th
                                            key={header.id}
                                            scope="col"
                                            className={`${virtualStyles.theadCell}${headerIndex === 0 ? ` ${virtualStyles.stickyColumn}` : ''}`}
                                            style={{
                                                cursor: header.column.getCanSort()
                                                    ? 'pointer'
                                                    : 'default',
                                                width: header.getSize(),
                                                minWidth:
                                                    header.column.columnDef
                                                        .minSize,
                                                position:
                                                    headerIndex === 0
                                                        ? 'sticky'
                                                        : 'relative',
                                            }}
                                            onClick={header.column.getToggleSortingHandler()}
                                        >
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {{
                                                asc: ' ▲',
                                                desc: ' ▼',
                                            }[
                                                header.column.getIsSorted() as string
                                            ] ?? ''}
                                            <div
                                                onMouseDown={header.getResizeHandler()}
                                                onTouchStart={header.getResizeHandler()}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                                className={`${virtualStyles.resizeHandle}${header.column.getIsResizing() ? ` ${virtualStyles.isResizing}` : ''}`}
                                            />
                                        </th>
                                    )
                                )}
                            </tr>
                        ))}
                    </thead>
                    <tbody
                        className={virtualStyles.virtualizedTbody}
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const row = paginatedRows[virtualRow.index]
                            return (
                                <tr
                                    key={row.id}
                                    data-index={virtualRow.index}
                                    ref={(node) =>
                                        rowVirtualizer.measureElement(node)
                                    }
                                    className={virtualStyles.virtualizedRow}
                                    style={{
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {row
                                        .getVisibleCells()
                                        .map((cell, cellIndex) => (
                                            <td
                                                key={cell.id}
                                                className={`${virtualStyles.virtualizedCell}${cellIndex === 0 ? ` ${virtualStyles.stickyColumn}` : ''}`}
                                                style={{
                                                    width: cell.column.getSize(),
                                                    minWidth:
                                                        cell.column.columnDef
                                                            .minSize,
                                                }}
                                            >
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
            </div>
            {!isShowingAll && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 0',
                    }}
                >
                    <div>
                        Page {table.getState().pagination.pageIndex + 1} of{' '}
                        {table.getPageCount()}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                            type="button"
                            onClick={() => table.firstPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            First
                        </Button>
                        <Button
                            type="button"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                        <Button
                            type="button"
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Next
                        </Button>
                        <Button
                            type="button"
                            onClick={() => table.lastPage()}
                            disabled={!table.getCanNextPage()}
                        >
                            Last
                        </Button>
                    </div>
                </div>
            )}
        </>
    )
}
