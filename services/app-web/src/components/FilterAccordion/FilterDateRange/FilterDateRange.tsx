import React, { useRef, forwardRef, useImperativeHandle } from 'react'
import { Fieldset } from '@trussworks/react-uswds'
import { DateRangePicker } from '../../DateRangePicker/DateRangePicker'
import styles from './FilterDateRange.module.scss'
import { formatUserInputDate } from '../../../formHelpers'
import { DatePickerRef } from '../../DatePicker/DatePicker'

export type FilterDateRangePropType = {
    name: string
    label?: string
    onStartChange: (date?: string | undefined) => void
    onEndChange: (date?: string | undefined) => void
    startDateDefaultValue?: string
    endDateDefaultValue?: string
}

export type FilterDateRangeRef = {
    clearFilter: () => void
}

export const FilterDateRange = forwardRef(
    (
        props: FilterDateRangePropType,
        ref: React.Ref<FilterDateRangeRef>
    ): React.ReactElement => {
        const {
            name,
            label,
            onStartChange,
            onEndChange,
            startDateDefaultValue,
            endDateDefaultValue,
        } = props

        const startDateInputRef = useRef<DatePickerRef>(null)
        const endDateInputRef = useRef<DatePickerRef>(null)

        useImperativeHandle(ref, () => ({
            clearFilter: (): void => {
                if (startDateInputRef.current && endDateInputRef.current) {
                    startDateInputRef.current.clearInput()
                    endDateInputRef.current.clearInput()
                }
            },
        }))

        return (
            <Fieldset data-testid={`${name}-filter`} legend={label}>
                <DateRangePicker
                    className={styles.dateRangePicker}
                    startDateHint="mm/dd/yyyy"
                    startDateLabel="Start date"
                    startDatePickerProps={{
                        inputRef: startDateInputRef,
                        defaultValue: startDateDefaultValue,
                        disabled: false,
                        id: `${name}DateStart`,
                        name: `${name}DateStart`,
                        onChange: (date) =>
                            onStartChange(formatUserInputDate(date)),
                    }}
                    endDateHint="mm/dd/yyyy"
                    endDateLabel="End date"
                    endDatePickerProps={{
                        inputRef: endDateInputRef,
                        defaultValue: endDateDefaultValue,
                        disabled: false,
                        id: `${name}DateEnd`,
                        name: `${name}DateEnd`,
                        onChange: (date) =>
                            onEndChange(formatUserInputDate(date)),
                    }}
                />
            </Fieldset>
        )
    }
)
