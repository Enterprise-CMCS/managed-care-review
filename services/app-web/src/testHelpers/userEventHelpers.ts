import userEvent from '@testing-library/user-event'
import { getExternalInputFromDateRange } from './fieldHelpers'

// For testing, properly access external input for date range picker to set value
type UpdateDateRangeType = {
    start: { elements: HTMLElement[]; date: string }
    end: { elements: HTMLElement[]; date: string }
}
const updateDateRange = async ({ start, end }: UpdateDateRangeType) => {
    const { elements: startElements, date: startDate } = start
    const { elements: endElements, date: endDate } = end

    const startInput = getExternalInputFromDateRange(startElements)
    startInput.focus()
    await userEvent.paste(startDate)

    const endInput = getExternalInputFromDateRange(endElements)
    endInput.focus()
    await userEvent.paste(endDate)
}

export { updateDateRange }
