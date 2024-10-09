import { dayjs } from './dayjs'

/**
 * We store calendar dates in UTC for consistency. This formats a date time into 'MM/DD/YYYY' based on timezone.
 * @param date date to be formatted
 * @param timeZone Timezone formatted date should be in.
 * "UTC" is usually for displaying user inputted calendar dates like contract start/end dates.
 * "America/New_York" is usually for displaying app generated timestamps, where timezones are important. This should be
 * only used for display and not saving. We have decided to show these types of dates in "America/New_York" in the app.
 */
function formatCalendarDate(date: Date | undefined | string, timeZone: 'UTC' | 'America/New_York'): string {
    if (!date || !dayjs(date).isValid()) {
        return ''
    }
    return dayjs(date).tz(timeZone).format('MM/DD/YYYY')
}

/**
 * We store calendar dates in UTC for consistency. This formats a date time into 'MM/DD/YYYY h:mma timezone'.
 * "America/New_York" (ET) is usually for displaying app generated timestamps, where timezones are important. This should
 * be only used for display and not saving. We have decided to show these types of dates in "America/New_York" in the app
 * @param date date to be formatted
 */
function formatToEasternTime(date: Date | undefined | string): string {
    if (!date || !dayjs(date).isValid()) {
        return ''
    }
    const formattedDate = dayjs(date).tz('America/New_York').format('MM/DD/YYYY h:mma')
    return `${formattedDate} ET`
}

function formatRateNameDate(date: Date | undefined): string {
    if (!date) {
        return ''
    }
    return dayjs(date).tz('UTC').format('YYYYMMDD')
}

export { formatCalendarDate, formatRateNameDate, formatToEasternTime }
