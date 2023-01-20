import { formatCalendarDate } from '../../../common-code/dateHelpers'

// Intended for use as children passed to DataDetail
export const DataDetailDateRange = ({
    startDate,
    endDate,
}: {
    startDate?: Date
    endDate?: Date
}): React.ReactElement | null => {
    if (!startDate || !endDate) return null
    return (
        <>{`${formatCalendarDate(startDate)} to ${formatCalendarDate(
            endDate
        )}`}</>
    )
}
