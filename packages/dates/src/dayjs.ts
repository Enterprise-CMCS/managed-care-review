/// <reference path="./dayjs.d.ts" />

import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import duration from 'dayjs/plugin/duration'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'

import 'dayjs/plugin/advancedFormat'
import 'dayjs/plugin/isLeapYear'
import 'dayjs/plugin/timezone'
import 'dayjs/plugin/utc'
import 'dayjs/plugin/duration'
import 'dayjs/plugin/customParseFormat'
import 'dayjs/plugin/isSameOrAfter'

dayjs.extend(utc)
dayjs.extend(advancedFormat)
dayjs.extend(timezone)
dayjs.extend(isLeapYear)
dayjs.extend(duration)
dayjs.extend(customParseFormat)
dayjs.extend(isSameOrAfter)

export { dayjs }
