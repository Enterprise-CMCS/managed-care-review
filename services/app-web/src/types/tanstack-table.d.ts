import '@tanstack/react-table'

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        dataTestID: string
    }
    interface FilterFns {
        dateRangeFilter: FilterFn<unknown>
        analystFilter: FilterFns<unknown>
    }
}
