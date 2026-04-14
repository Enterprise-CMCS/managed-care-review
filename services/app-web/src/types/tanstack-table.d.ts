import '@tanstack/react-table'
import { ProgramArgType } from '@mc-review/submissions'

declare module '@tanstack/react-table' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        dataTestID?: string
        isRateFilter?: boolean
    }
    interface FilterFns {
        dateRangeFilter: FilterFn<unknown>
        analystFilter: FilterFns<unknown>
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface TableMeta<TData extends RowData> {
        programsByState?: Map<string, ProgramArgType[]>
    }
}
