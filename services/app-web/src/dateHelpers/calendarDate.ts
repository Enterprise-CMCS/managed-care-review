import { dayjs } from './dayjs'

// We store calendar dates (dates with no time info) in UTC for consistency.
// This formats a date correctly like '12/02/2022' for display.
function formatCalendarDate(date: Date): string {
    return dayjs(date).tz('UTC').format('MM/DD/YYYY')
}

export {
    formatCalendarDate
}
