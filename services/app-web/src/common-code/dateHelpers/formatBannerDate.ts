import { formatToEasternTime } from './calendarDate';

export const formatBannerDate = (date?: Date) =>
    date
        ? `${formatToEasternTime(date)}`
        : 'Not available'
