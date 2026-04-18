import type { DateValidationCitationInput, DateValidationFieldInput } from '../prompts'
import { canonicalizeDateToken } from './dateToken'

const MONTH_PATTERN =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
const DATE_PATTERN = `${MONTH_PATTERN}\\s+\\d{1,2},?\\s*\\d{4}|\\d{1,2}/\\d{1,2}/\\d{4}|\\d{4}-\\d{2}-\\d{2}`
const TERM_RANGE_PATTERNS: RegExp[] = [
  new RegExp(
    `term of this agreement is\\s*:?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
    'i'
  ),
  new RegExp(
    `term of this contract shall be[\\s\\S]{0,120}?from\\s*(${DATE_PATTERN})[\\s\\S]{0,80}?through\\s*(${DATE_PATTERN})`,
    'i'
  ),
  new RegExp(
    `contract year,?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
    'i'
  ),
  new RegExp(
    `amended to read\\s*:?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
    'i'
  ),
  new RegExp(
    `deemed to read\\s*:?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
    'i'
  ),
  new RegExp(
    `will become effective\\s*(${DATE_PATTERN})[\\s\\S]{0,200}?through\\s*(${DATE_PATTERN})`,
    'i'
  )
]

export interface ResolvedTermRangeDate {
  date: string
  chunks: DateValidationCitationInput[]
}

export function resolveSingleTermRangeDateFromChunks(
  field: DateValidationFieldInput['field'],
  chunks: DateValidationCitationInput[]
): ResolvedTermRangeDate | null {
  const resolvedDates = new Map<
    string,
    { date: string; chunks: DateValidationCitationInput[] }
  >()

  for (const chunk of chunks) {
    for (const pattern of TERM_RANGE_PATTERNS) {
      const match = chunk.text.match(pattern)

      if (!match) {
        continue
      }

      const rangeDate =
        field === 'contractStartDate' ? match[1] : match[2]

      if (!rangeDate) {
        continue
      }

      const canonicalDate = canonicalizeDateToken(rangeDate)

      if (!canonicalDate) {
        continue
      }

      const existing = resolvedDates.get(canonicalDate)

      if (existing) {
        if (!existing.chunks.some((candidate) => candidate.chunkId === chunk.chunkId)) {
          existing.chunks.push(chunk)
        }
        continue
      }

      resolvedDates.set(canonicalDate, {
        date: canonicalDate,
        chunks: [chunk]
      })
    }
  }

  // Only use term-clause text as a tie-breaker when it resolves to one unique
  // canonical date. If multiple term clauses disagree, callers should keep the
  // result in a conservative conflict/not-enough-evidence state.
  if (resolvedDates.size !== 1) {
    return null
  }

  return [...resolvedDates.values()][0] ?? null
}
