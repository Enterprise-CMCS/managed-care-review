import { formatToPacificTime } from './calendarDate';

export const formatBannerDate = (date?: Date | string) =>
    date
        ? `${formatToPacificTime(date)}`
        : 'Not available'
