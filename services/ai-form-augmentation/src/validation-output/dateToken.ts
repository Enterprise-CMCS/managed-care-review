import { dayjs } from '../../../../packages/dates/src/dayjs'

const ACCEPTED_DATE_FORMATS = [
  'M/D/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'MMMM D, YYYY',
  'MMMM D YYYY',
  'MMM D, YYYY',
  'MMM D YYYY'
] as const

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function canonicalizeDateToken(value: string): string | null {
  const normalizedValue = normalizeWhitespace(value).replace(/\s*,\s*/g, ', ')
  const parsedDate = dayjs(normalizedValue, [...ACCEPTED_DATE_FORMATS], true)

  if (parsedDate.isValid()) {
    return parsedDate.format('MM/DD/YYYY')
  }

  return null
}
