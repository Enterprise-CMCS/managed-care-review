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

const formatUserInputDate = (initialValue?: string): string | undefined => {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjs(initialValue).format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}

export {
    formatCalendarDate,
    formatRateNameDate,
    formatToPacificTime,
    formatUserInputDate,
}
