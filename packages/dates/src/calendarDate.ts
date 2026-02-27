import { dayjs } from './dayjs'

/**
 * We store calendar dates in UTC for consistency. This formats a date time into 'MM/DD/YYYY' based on timezone.
 * @param date date to be formatted
 * @param timeZone Timezone formatted date should be in.
 * "UTC" is usually for displaying user inputted calendar dates like contract start/end dates.
 * "America/Los_Angeles" is usually for displaying app generated timestamps, where timezones are important. This should be
 * only used for display and not saving. We have decided to show these types of dates in "America/Los_Angeles" in the app.
 */
function formatCalendarDate(
    date: Date | undefined | string,
    timeZone: 'UTC' | 'America/Los_Angeles'
): string {
    if (!date || !dayjs(date).isValid()) {
        return ''
    }
    return dayjs(date).tz(timeZone).format('MM/DD/YYYY')
}

/**
 * We store calendar dates in UTC for consistency. This formats a date time into 'MM/DD/YYYY h:mma timezone'.
 * "America/Los_Angeles" (PT) is usually for displaying app generated timestamps, where timezones are important. This should
 * be only used for display and not saving. We have decided to show these types of dates in "America/Los_Angeles" in the app
 * @param date date to be formatted
 */
function formatToPacificTime(date: Date | undefined | string): string {
    if (!date || !dayjs(date).isValid()) {
        return ''
    }
    const formattedDate = dayjs(date)
        .tz('America/Los_Angeles')
        .format('MM/DD/YYYY h:mma')
    return `${formattedDate} PT`
}

function formatRateNameDate(date: Date | undefined): string {
    if (!date) {
        return ''
    }
    return dayjs(date).tz('UTC').format('YYYYMMDD')
}

function formatUserInputDate(initialValue?: string): string | undefined {
    if (!initialValue) return initialValue
    /*
    checks if DatePicker input is valid: either 'M/D/YYYY' or 'MM/DD/YYYY' format
    and formats valid ipnut to 'YYYY-MM-DD' for data processing
    returns invalid input unchanged to be handled by validation code
    */

    // input has 1 or 2 digits for month/day)
    const completeFormatRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/
    if (!completeFormatRegex.test(initialValue)) {
        return initialValue
    }

    // all parts of the date exist
    const parts = initialValue.split('/')
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
        return initialValue
    }

    // year is exactly 4 digits
    if (parts[2].length !== 4) {
        return initialValue
    }

    // it is a valid date in short format, return formatted to YYYY-MM-DD
    const dayjsShortValue = dayjs(initialValue, 'M/D/YYYY', true)
    if (dayjsShortValue.isValid()) {
        return dayjsShortValue.format('YYYY-MM-DD')
    }

    // it is a valid date in long format, return formatted to YYYY-MM-DD
    const dayjsLongValue = dayjs(initialValue, 'MM/DD/YYYY', true)
    return dayjsLongValue.format('YYYY-MM-DD')
}

export {
    formatCalendarDate,
    formatRateNameDate,
    formatToPacificTime,
    formatUserInputDate,
}
