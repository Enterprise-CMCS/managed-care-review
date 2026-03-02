import { dayjs } from '@mc-review/dates'
import * as Yup from 'yup'
import {
    hasAtLeastOneFile,
    hasNoFileErrors,
    hasNoLoadingFiles,
    hasNoMoreThanOneFile,
} from '../components/FileUpload'

/*
    validateDateFormat is a custom Yup method
    This is needed to transform manual user input format MM/DD/YYYY to YYYY-MM-DD
    and display specific errors when date is invalid
    More on this approach: https://github.com/jquense/yup#yupaddmethodschematype-schema-name-string-method--schema-void

*/
function validateDateFormat(
    this: Yup.DateSchema<
        Date | undefined,
        Record<string, any>,
        Date | undefined
    >,
    formats: string,
    parseStrict: boolean
): Yup.DateSchema<Date | undefined, Record<string, any>, Date | undefined> {
    return this.transform(function (value, originalValue) {
        //catch incomplete date entries from user.
        if (
            typeof originalValue === 'string' &&
            !isValidDateString(originalValue)
        ) {
            return new Date('') // force 'Invalid Date'
        }
        //here partial date entry like '5/5/' transforms into valid date
        if (this.isType(value)) return value

        value = dayjs(originalValue, formats, parseStrict)
        return value.isValid() ? value.toDate() : new Date('') // force return 'Invalid Date'
    })
}

const validateDateRange12Months = (
    startDateField: string,
    endDateField: string
): boolean => {
    const startDate = dayjs(startDateField)
    const isStartDateLeapDay =
        startDate.isLeapYear() &&
        startDate.month() === 1 &&
        startDate.date() === 29
    const oneYearLater = isStartDateLeapDay
        ? startDate.add(1, 'year')
        : startDate.add(1, 'year').subtract(1, 'day')
    return dayjs(endDateField).isSame(oneYearLater, 'day')
}

const isDateRangeEmpty = (startDate?: string, endDate?: string) =>
    !startDate && !endDate

const validateFileItemsList = ({ required }: { required: boolean }) => {
    return Yup.mixed()
        .test(
            'is-not-empty',
            'You must upload at least one document',
            (value) => (required ? hasAtLeastOneFile(value) : true)
        )
        .test(
            'is-not-loading',
            'You must wait for all documents to finish uploading before continuing',
            (value) => hasNoLoadingFiles(value)
        )
        .test(
            'is-error-free',
            'You must remove all documents with error messages before continuing',
            (value) => hasNoFileErrors(value)
        )
}

const validateFileItemsListSingleUpload = ({
    required,
}: {
    required: boolean
}) => {
    return Yup.mixed()
        .test(
            'is-not-empty',
            'You must upload a rate certification',
            (value) => (required ? hasAtLeastOneFile(value) : true)
        )
        .test(
            'is-not-loading',
            'You must wait for all documents to finish uploading before continuing',
            (value) => hasNoLoadingFiles(value)
        )
        .test(
            'is-error-free',
            'You must remove all documents with error messages before continuing',
            (value) => hasNoFileErrors(value)
        )
        .test(
            'is-not-more-than-one',
            'Only one document is allowed for a rate certification. You must remove documents before continuing.',
            (value) => hasNoMoreThanOneFile(value)
        )
}

//checks user's date entry for completenes and date logic compliance
function isValidDateString(value: string): boolean {
    if (!value) return false

    // already in internal YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return dayjs(value, 'YYYY-MM-DD', true).isValid()
    }

    // must match MM/DD/YYYY or M/D/YYYY user input format
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) return false

    // strict parse and cross-check to catch impossible dates like 2/30 or 14/15
    const parsed = dayjs(value, 'M/D/YYYY', true)
    if (!parsed.isValid()) return false

    const [month, day, year] = value.split('/').map((p) => parseInt(p, 10))
    return (
        parsed.month() === month - 1 &&
        parsed.date() === day &&
        parsed.year() === year
    )
}

export {
    isDateRangeEmpty,
    isValidDateString,
    validateDateFormat,
    validateDateRange12Months,
    validateFileItemsList,
    validateFileItemsListSingleUpload,
}
