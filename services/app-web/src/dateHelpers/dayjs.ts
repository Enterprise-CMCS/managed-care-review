import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import timezone from 'dayjs/plugin/timezone';
import isLeapYear from 'dayjs/plugin/isLeapYear'

dayjs.extend(advancedFormat)
dayjs.extend(timezone)
dayjs.extend(isLeapYear)

export { dayjs }
