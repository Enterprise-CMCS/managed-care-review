import { formatCalendarDate } from '../../../common-code/dateHelpers'
import { DataDetailMissingField } from '../'

export const DataDetailDateRange = ({
    startDate,
    endDate,
}: {
    startDate?: Date
    endDate?: Date
}): React.ReactElement => {
    if (!startDate || !endDate) return <DataDetailMissingField />
    return (
        <>{`${formatCalendarDate(startDate)} to ${formatCalendarDate(
            endDate
        )}`}</>
    )
}
