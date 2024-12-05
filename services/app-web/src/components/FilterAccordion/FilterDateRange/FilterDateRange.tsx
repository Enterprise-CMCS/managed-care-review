import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react'
import { Fieldset, FormGroup, Label } from '@trussworks/react-uswds'
import {
    DatePicker,
    DatePickerProps,
    DatePickerRef,
} from './_DatePicker/DatePicker'
import { formatDate, parseDateString } from './_DatePicker/utils'
import { DEFAULT_EXTERNAL_DATE_FORMAT } from './_DatePicker/constants'
import classnames from 'classnames'
import { formatUserInputDate } from '../../../formHelpers'
import { dayjs } from '@mc-review/common-code'
import { PoliteErrorMessage } from '../../PoliteErrorMessage'
import styles from './FilterDateRange.module.scss'

/**
 *  This component recreates the @trussworks/react-uswds DateRangePicker with a modification to validate and clear
 *  individual DatePicker inputs. In addition, a modified version of the @trussworks/react-uswds DatePicker component is used, located in ./_DatePicker.
 
 *This was done to unlock ability for the user to use date inputs as controlled components. There are two current use cases:
 *  clear both input values at once (such as when using the clear filter button on the filter accordion)
 *  enable validations and displaying error messages on each input
 
 * We will no longer need to a modified DatePicker when:
 * - DatePicker is updated to surface a ref to the input
 * - DateRangePicker adds the option to display errors on each DatePicker input
 */

export type FilterDateRangePropType = {
    legend?: string
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

export const FilterDateRange = forwardRef(
    (
        props: FilterDateRangePropType & JSX.IntrinsicElements['div'],
        ref: React.Ref<FilterDateRangeRef>
    ): React.ReactElement => {
        const {
            legend,
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

        const isValidateDate = (date: string) =>
            date.length === 10 && dayjs(date).isValid()

        // Validate start date is less than or equal to end date.
        const validateDateRange = ({
            startDate,
            endDate,
        }: {
            startDate: Date
            endDate: Date
        }): void => {
            const isValidRange = startDate.getTime() <= endDate.getTime()
            setShowStartDateError(!isValidRange)
            setShowEndDateError(!isValidRange)
        }

        // Validate when valid date format is inputted and return if valid. If date is undefined also return; this is
        // when the date is cleared out of the input.
        const onStartDateChangeValidation = (date?: string) => {
            if (date && isValidateDate(date)) {
                setShowStartDateError(false)
                startDatePickerOnChange(formatUserInputDate(date.trimEnd()))
            } else if (!date) {
                startDatePickerOnChange(date)
            }
        }

        const onEndDateChangeValidation = (date?: string) => {
            if (date && isValidateDate(date)) {
                setShowEndDateError(false)
                endDatePickerOnChange(formatUserInputDate(date.trimEnd()))
            } else if (!date) {
                endDatePickerOnChange(date)
            }
        }

        const onBlurValidation = () => {
            const startDate = startDateInputRef?.current?.value ?? ''
            const endDate = endDateInputRef?.current?.value ?? ''

            if (isValidateDate(startDate) && isValidateDate(endDate)) {
                validateDateRange({
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                })
            } else {
                if (startDate) {
                    setShowStartDateError(!isValidateDate(startDate))
                }
                if (endDate) {
                    setShowEndDateError(!isValidateDate(endDate))
                }
            }
        }

        return (
            <Fieldset
                className={classes}
                data-testid="filter-date-range-picker"
                legend={legend}
            >
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
                        <PoliteErrorMessage
                            formFieldLabel={`${legend} - ${startDateLabel}`}
                        >
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
                        onBlur={onBlurValidation}
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
                        <PoliteErrorMessage
                            formFieldLabel={`${legend} - ${endDateLabel}`}
                        >
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
                        onBlur={onBlurValidation}
                    />
                </FormGroup>
            </Fieldset>
        )
    }
)
