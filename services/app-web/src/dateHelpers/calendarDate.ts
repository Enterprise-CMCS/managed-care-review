import { dayjs } from './dayjs'

// We store calendar dates (dates with no time info) in UTC for consistency.
// This formats a date correctly like '12/02/2022' for display.
function formatCalendarDate(date: Date | undefined): string {
    if (!date) {
        return ''
    }
    return dayjs(date).tz('UTC').format('MM/DD/YYYY')
}

function formatRateNameDate(date: Date | undefined): string {
    if (!date) {
        return ''
    }
    return dayjs(date).tz('UTC').format('YYYYMMDD')
}

export { formatCalendarDate, formatRateNameDate }
