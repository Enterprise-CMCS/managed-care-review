import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { FormGroup, Label } from '@trussworks/react-uswds'
import {
    DatePicker,
    DatePickerProps,
    DatePickerRef,
} from '../../DatePicker/DatePicker'
import { formatDate, parseDateString } from '../../DatePicker/utils'
import { DEFAULT_EXTERNAL_DATE_FORMAT } from '../../DatePicker/constants'
import classnames from 'classnames'
import styles from './FilterDateRange.module.scss'
import { formatUserInputDate } from '../../../formHelpers'
import { dayjs } from '../../../common-code/dateHelpers/dayjs'
import { PoliteErrorMessage } from '../../PoliteErrorMessage'

export type FilterDateRangePropType = {
    startDateLabel?: string
    startDateHint?: string
    startDatePickerProps: Omit<DatePickerProps, 'rangeDate'>
    endDateLabel?: string
    endDateHint?: string
    endDatePickerProps: Omit<DatePickerProps, 'rangeDate'>
    className?: string
}

export type FilterDateRangeRef = {
    clearFilter: () => void
}

type DatePickerOnBlurType =
    | React.FocusEvent<HTMLInputElement>
    | React.FocusEvent<HTMLDivElement>

export const FilterDateRange = forwardRef(
    (
        props: FilterDateRangePropType & JSX.IntrinsicElements['div'],
        ref: React.Ref<FilterDateRangeRef>
    ): React.ReactElement => {
        const {
            startDateLabel,
            startDateHint,
            startDatePickerProps,
            endDateLabel,
            endDateHint,
            endDatePickerProps,
            className,
        } = props

        const [showStartDateError, setShowStartDateError] =
            useState<boolean>(false)
        const [showEndDateError, setShowEndDateError] = useState<boolean>(false)

        const [startDateInternalValue, setStartDateInternalValue] = useState<
            string | undefined
        >(startDatePickerProps.defaultValue)
        const [endDateInternalValue, setEndDateInternalValue] = useState<
            string | undefined
        >(endDatePickerProps.defaultValue)

        const startDateInputRef = useRef<DatePickerRef>(null)
        const endDateInputRef = useRef<DatePickerRef>(null)

        useImperativeHandle(ref, () => ({
            clearFilter: (): void => {
                if (startDateInputRef.current && endDateInputRef.current) {
                    setShowStartDateError(false)
                    setShowEndDateError(false)
                    startDateInputRef.current.clearInput()
                    endDateInputRef.current.clearInput()
                }
            },
        }))

        const getMaxStartDate = (): string | undefined => {
            const { maxDate: maxStartDate } = startDatePickerProps
            const parsedMaxStartDate =
                maxStartDate && parseDateString(maxStartDate)
            const parsedCurrentEndDate =
                endDateInternalValue && parseDateString(endDateInternalValue)

            if (parsedCurrentEndDate && parsedMaxStartDate) {
                if (
                    parsedCurrentEndDate.getTime() <
                    parsedMaxStartDate.getTime()
                ) {
                    return formatDate(parsedCurrentEndDate)
                } else {
                    return formatDate(parsedMaxStartDate)
                }
            } else {
                return (
                    (parsedCurrentEndDate &&
                        formatDate(parsedCurrentEndDate)) ||
                    (parsedMaxStartDate && formatDate(parsedMaxStartDate)) ||
                    undefined
                )
            }
        }

        const getMinEndDate = (): string | undefined => {
            const { minDate: minEndDate } = endDatePickerProps
            const parsedMinEndDate = minEndDate && parseDateString(minEndDate)
            const parsedCurrentStartDate =
                startDateInternalValue &&
                parseDateString(startDateInternalValue)

            if (parsedCurrentStartDate && parsedMinEndDate) {
                if (
                    parsedCurrentStartDate.getTime() >
                    parsedMinEndDate.getTime()
                ) {
                    return formatDate(parsedCurrentStartDate)
                } else {
                    return formatDate(parsedMinEndDate)
                }
            } else {
                return (
                    (parsedCurrentStartDate &&
                        formatDate(parsedCurrentStartDate)) ||
                    (parsedMinEndDate && formatDate(parsedMinEndDate)) ||
                    undefined
                )
            }
        }

        const getDatePickerOnChangeFn = (
            originalOnChangeFn: ((val?: string) => void) | undefined,
            setStateInternalValueFn: React.Dispatch<
                React.SetStateAction<string | undefined>
            >
        ): ((val?: string) => void) => {
            return (externallyFormattedValue?: string | undefined): void => {
                const parsedValue =
                    externallyFormattedValue &&
                    parseDateString(
                        externallyFormattedValue,
                        DEFAULT_EXTERNAL_DATE_FORMAT
                    )

                if (parsedValue) {
                    // The externally input and formatted value is a valid date.
                    // Convert to internal format and set the internal state to
                    // the selected date.
                    const internallyFormattedValue = formatDate(parsedValue)
                    setStateInternalValueFn(internallyFormattedValue)
                } else {
                    // Externally input and formatted value is not a valid date.
                    // Do not attempt to convert to internal date format.
                    // Simply update internal state with the input value as received.
                    setStateInternalValueFn(externallyFormattedValue)
                }

                if (originalOnChangeFn)
                    originalOnChangeFn(externallyFormattedValue)
            }
        }

        const startDatePickerOnChange = getDatePickerOnChangeFn(
            startDatePickerProps.onChange,
            setStartDateInternalValue
        )

        const endDatePickerOnChange = getDatePickerOnChangeFn(
            endDatePickerProps.onChange,
            setEndDateInternalValue
        )

        const classes = classnames(
            className,
            'usa-date-range-picker',
            styles.dateRangePicker
        )
        const startDatePickerClasses = classnames(
            startDatePickerProps.className,
            'usa-date-range-picker__range-start'
        )
        const endDatePickerClasses = classnames(
            endDatePickerProps.className,
            'usa-date-range-picker__range-end'
        )

        const startDatePickerLabelId = `${startDatePickerProps.id}-label`
        const startDatePickerHintId = `${startDatePickerProps.id}-hint`

        const endDatePickerLabelId = `${endDatePickerProps.id}-label`
        const endDatePickerHintId = `${endDatePickerProps.id}-hint`

        const validateDate = (date: string) =>
            date.length === 10 && dayjs(date).isValid()

        const onStartDateChangeValidation = (date?: string) => {
            if (date && validateDate(date)) {
                setShowStartDateError(false)
                startDatePickerOnChange(formatUserInputDate(date.trimEnd()))
            } else if (!date) {
                startDatePickerOnChange(date)
            }
        }

        const onEndDateChangeValidation = (date?: string) => {
            if (date && validateDate(date)) {
                setShowEndDateError(false)
                endDatePickerOnChange(formatUserInputDate(date.trimEnd()))
            } else if (!date) {
                endDatePickerOnChange(date)
            }
        }

        const onStartDateBlurValidation = (event: DatePickerOnBlurType) => {
            const e = event as React.FocusEvent<HTMLInputElement>
            const date = e.target.value
            if (date.length > 0) {
                setShowStartDateError(!validateDate(date.trimEnd()))
            }
        }

        const onEndDateBlurValidation = (event: DatePickerOnBlurType) => {
            const e = event as React.FocusEvent<HTMLInputElement>
            const date = e.target.value
            if (date.length > 0) {
                setShowEndDateError(!validateDate(date.trimEnd()))
            }
        }

        return (
            <div className={classes} data-testid="filter-date-range-picker">
                <FormGroup error={showStartDateError}>
                    {startDateLabel && (
                        <Label
                            id={startDatePickerLabelId}
                            htmlFor={startDatePickerProps.id}
                        >
                            {startDateLabel}
                        </Label>
                    )}
                    {showStartDateError && (
                        <PoliteErrorMessage>
                            You must enter a valid date
                        </PoliteErrorMessage>
                    )}
                    {startDateHint && (
                        <div className="usa-hint" id={startDatePickerHintId}>
                            {startDateHint}
                        </div>
                    )}
                    <DatePicker
                        className={startDatePickerClasses}
                        rangeDate={endDateInternalValue}
                        {...startDatePickerProps}
                        aria-labelledby={
                            startDateLabel && startDatePickerLabelId
                        }
                        aria-describedby={
                            startDateHint && startDatePickerHintId
                        }
                        onChange={onStartDateChangeValidation}
                        maxDate={getMaxStartDate()}
                        inputRef={startDateInputRef}
                        onBlur={onStartDateBlurValidation}
                    />
                </FormGroup>

                <FormGroup error={showEndDateError}>
                    {endDateLabel && (
                        <Label
                            id={endDatePickerLabelId}
                            htmlFor={endDatePickerProps.id}
                        >
                            {endDateLabel}
                        </Label>
                    )}
                    {showEndDateError && (
                        <PoliteErrorMessage>
                            You must enter a valid date
                        </PoliteErrorMessage>
                    )}
                    {endDateHint && (
                        <div className="usa-hint" id={endDatePickerHintId}>
                            {endDateHint}
                        </div>
                    )}
                    <DatePicker
                        className={endDatePickerClasses}
                        rangeDate={startDateInternalValue}
                        {...endDatePickerProps}
                        aria-labelledby={endDateLabel && endDatePickerLabelId}
                        aria-describedby={endDateHint && endDatePickerHintId}
                        onChange={onEndDateChangeValidation}
                        minDate={getMinEndDate()}
                        inputRef={endDateInputRef}
                        onBlur={onEndDateBlurValidation}
                    />
                </FormGroup>
            </div>
        )
    }
)
