import React from 'react'
import { DateRangePicker, Fieldset } from '@trussworks/react-uswds'
import styles from './FilterDateRange.module.scss'

export type FilterDateRangePropType = {
    name: string
    label?: string
    onStartChange: (date?: string | undefined) => void
    onEndChange: (date?: string | undefined) => void
    startDateDefaultValue?: string
    endDateDefaultValue?: string
}

export const FilterDateRange = ({
    name,
    label,
    onStartChange,
    onEndChange,
    startDateDefaultValue,
    endDateDefaultValue,
}: FilterDateRangePropType): React.ReactElement => {
    return (
        <Fieldset data-testid={`${name}-filter`} legend={label}>
            <DateRangePicker
                className={styles.dateRangePicker}
                startDateHint="mm/dd/yyyy"
                startDateLabel="Start date"
                startDatePickerProps={{
                    disabled: false,
                    defaultValue: startDateDefaultValue,
                    id: `${name}DateStart`,
                    name: `${name}DateStart`,
                    onChange: onStartChange,
                }}
                endDateHint="mm/dd/yyyy"
                endDateLabel="End date"
                endDatePickerProps={{
                    disabled: false,
                    defaultValue: endDateDefaultValue,
                    id: `${name}DateEnd`,
                    name: `${name}DateEnd`,
                    onChange: onEndChange,
                }}
            />
        </Fieldset>
    )
}
