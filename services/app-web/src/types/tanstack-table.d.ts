import '@tanstack/react-table'

declare module '@tanstack/react-table' {
    // oxlint-disable-next-line no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        dataTestID: string
    }
    interface FilterFns {
        dateRangeFilter: FilterFn<unknown>
        analystFilter: FilterFns<unknown>
    }
}
