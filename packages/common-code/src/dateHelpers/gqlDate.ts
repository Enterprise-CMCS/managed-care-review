import { dayjs } from './dayjs'

// We store calendar dates (dates with no time info) in UTC for consistency.
// This formats a date correctly like '12/02/2022' for display.
export function formatGQLDate(date: Date | undefined): string | undefined {
    if (!date) {
        return undefined
    }
    return dayjs(date).tz('UTC').format('YYYY-MM-DD')
}
