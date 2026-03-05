import { fireEvent } from '@testing-library/react'
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
    fireEvent.change(startInput, { target: { value: startDate } })

    const endInput = getExternalInputFromDateRange(endElements)
    fireEvent.change(endInput, { target: { value: endDate } })
}

export { updateDateRange }
