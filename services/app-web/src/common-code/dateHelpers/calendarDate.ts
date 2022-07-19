import { CalendarDate } from '../healthPlanFormDataType'
import { dayjs } from './dayjs'

// We store calendar dates (dates with no time info) in UTC for consistency.
// This formats a date correctly like '12/02/2022' for display.
function formatCalendarDate(date: CalendarDate | undefined): string {
    if (!date) {
        return ''
    }
    const parsedCalendarDate = date.split('-')
    const month = parsedCalendarDate[1]
    const day = parsedCalendarDate[2]
    const year = parsedCalendarDate[0]
    return `${month}/${day}/${year}`
}

function formatDateTime(date: Date | undefined): string {
    if (!date) {
        return ''
    }
    return dayjs(date).tz('UTC').format('MM/DD/YYYY')
}

function formatRateNameDate(date: CalendarDate | undefined): string {
    if (!date) {
        return ''
    }
    const parsedCalendarDate = date.split('-')
    const month = parsedCalendarDate[1]
    const day = parsedCalendarDate[2]
    const year = parsedCalendarDate[0]
    return `${year}${month}${day}`
}

export { formatCalendarDate, formatRateNameDate, formatDateTime }
