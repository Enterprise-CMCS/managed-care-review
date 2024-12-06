import { formatToPacificTime } from './calendarDate';

export const formatBannerDate = (date?: Date) =>
    date
        ? `${formatToPacificTime(date)}`
        : 'Not available'
