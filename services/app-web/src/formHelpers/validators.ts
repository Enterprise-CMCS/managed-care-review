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
        if (this.isType(value)) return value
        value = dayjs(originalValue, formats, parseStrict)
        return value.isValid() ? value.toDate() : new Date('') // force return 'Invalid Date'
    })
}

/*
    custom Yup metod to catch incomplete date entries lile '5/5/'
*/
function validateDateStringFormat(
    this: Yup.StringSchema<
        string | undefined,
        Record<string, any>,
        string | undefined
    >,
    errorMessage: string = 'Date must be in MM/DD/YYYY format'
): Yup.StringSchema<
    string | undefined,
    Record<string, any>,
    string | undefined
> {
    return this.test('is-valid-date-format', errorMessage, function (value) {
        if (!value) return false

        // accept both MM/DD/YYYY (user input) and YYYY-MM-DD (already transformed)
        const userFormatRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/
        const internalFormatRegex = /^\d{4}-\d{2}-\d{2}$/

        // if already transformed to YYYY-MM-DD format, validate it
        if (internalFormatRegex.test(value)) {
            const parsed = dayjs(value, 'YYYY-MM-DD', true)
            return parsed.isValid()
        }

        // check MM/DD/YYYY format
        if (!userFormatRegex.test(value)) return false

        // check if has MM DD and YYYY parts
        const parts = value.split('/')
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
            return false
        }
        if (parts[2].length !== 4) return false

        // parse with flexible format (accepts both 1/1/2025 and 01/01/2025)
        const parsed = dayjs(value, 'M/D/YYYY', true)
        if (!parsed.isValid()) return false

        // verify the parsed date matches the input (catches invalid dates like 2/30)
        const [month, day, year] = parts.map((p) => parseInt(p, 10))
        if (
            parsed.month() !== month - 1 ||
            parsed.date() !== day ||
            parsed.year() !== year
        ) {
            return false
        }

        return true
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

export {
    isDateRangeEmpty,
    validateDateFormat,
    validateDateStringFormat,
    validateDateRange12Months,
    validateFileItemsList,
    validateFileItemsListSingleUpload,
}
