import { dayjs } from './dayjs'

// We store calendar dates in UTC for consistency. This formats a date like '12/02/2022'.
// These formatted dates, should only be used for display, never saved to the database.
function formatCalendarDate(date: Date | undefined | string, timeZone?: 'UTC' | 'America/New_York'): string {
    const tz = timeZone || 'UTC'
    if (!date || !dayjs(date).isValid()) {
        return ''
    }
    return dayjs(date).tz(tz).format('MM/DD/YYYY')
}

function formatDateTime(date: Date | undefined | string, timeZone?: 'UTC' | 'America/New_York'): string {
    const tz = timeZone || 'America/New_York'
    if (!date || !dayjs(date).isValid()) {
        return ''
    }
    return dayjs(date).tz(tz).format('MM/DD/YYYY h:mma')
}

function formatRateNameDate(date: Date | undefined): string {
    if (!date) {
        return ''
    }
    return dayjs(date).tz('UTC').format('YYYYMMDD')
}

export { formatCalendarDate, formatRateNameDate, formatDateTime }
