import '@tanstack/react-table'

declare module '@tanstack/table-core' {
    interface ColumnMeta<TData extends RowData, TValue> {
        dataTestID: string
    }
    interface FilterFns {
        dateRangeFilter: FilterFn<unknown>
    }

    type FilterFnOption<TData extends RowData> =
        | keyof FilterFns
        | FilterFn<TData>
        | 'dateRangeFilter' // Add this line
}
