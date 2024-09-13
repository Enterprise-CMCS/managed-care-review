import {dayjs} from './dayjs';

export const formatBannerDate = (date?: Date) =>
    date
        ? dayjs.utc(date).tz('America/New_York').format('MM/DD/YY h:mma')
        : 'Not available'
