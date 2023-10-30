import React from 'react'
import { DateRangePicker, Fieldset } from '@trussworks/react-uswds'
import styles from './FilterDateRange.module.scss'

export type FilterDateRangePropType = {
    name: string
    label?: string
    onStartChange: (date?: string | undefined) => void
    onEndChange: (date?: string | undefined) => void
    startDateValue?: string
    endDateValue?: string
}

export const FilterDateRange = ({
    name,
    label,
    onStartChange,
    onEndChange,
    startDateValue,
    endDateValue,
}: FilterDateRangePropType): React.ReactElement => {
    return (
        <Fieldset data-testid={`${name}-filter`} legend={label}>
            <DateRangePicker
                className={styles.dateRangePicker}
                startDateHint="mm/dd/yyyy"
                startDateLabel="Start date"
                startDatePickerProps={{
                    disabled: false,
                    value: startDateValue,
                    id: `${name}DateStart`,
                    name: `${name}DateStart`,
                    onChange: onStartChange,
                }}
                endDateHint="mm/dd/yyyy"
                endDateLabel="End date"
                endDatePickerProps={{
                    id: `${name}DateEnd`,
                    name: `${name}DateEnd`,
                    value: endDateValue,
                    onChange: onEndChange,
                }}
            />
        </Fieldset>
    )
}
