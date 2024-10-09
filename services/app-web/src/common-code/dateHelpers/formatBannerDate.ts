import {formatDateTime} from './calendarDate';

export const formatBannerDate = (date?: Date) =>
    date
        ? `${formatDateTime(date,'America/New_York')}`
        : 'Not available'
