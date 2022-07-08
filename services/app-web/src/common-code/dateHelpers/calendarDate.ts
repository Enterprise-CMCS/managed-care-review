import { CalendarDate } from '../healthPlanFormDataType'

// We store calendar dates (dates with no time info) in UTC for consistency.
// This formats a date correctly like '12/02/2022' for display.
function formatCalendarDate(date: CalendarDate | undefined): string {
    if (!date) {
        return ''
    }
    const parsedCalendarDate = date.split('/')
    const month = parseInt(parsedCalendarDate[0])
    const day = parseInt(parsedCalendarDate[1])
    const year = parseInt(parsedCalendarDate[2])
    return `${month}/${day}/${year}`
}

function formatRateNameDate(date: CalendarDate | undefined): string {
    if (!date) {
        return ''
    }
    const parsedCalendarDate = date.split('/')
    const month = parseInt(parsedCalendarDate[0])
    const day = parseInt(parsedCalendarDate[1])
    const year = parseInt(parsedCalendarDate[2])
    return `${year}${month}${day}`
}

export { formatCalendarDate, formatRateNameDate }
