import type { DateValidationCitationInput, DateValidationFieldInput } from '../prompts'
import { canonicalizeDateToken } from './dateToken'
import { extractOperativeAmendmentEffectiveDates } from './amendmentEffectiveDateSignal'

const MONTH_PATTERN =
  '(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
const DATE_PATTERN = `${MONTH_PATTERN}\\s+\\d{1,2},?\\s*\\d{4}|\\d{1,2}/\\d{1,2}/\\d{4}|\\d{4}-\\d{2}-\\d{2}`
const DATE_AT_START_PATTERN = new RegExp(`^(?:${DATE_PATTERN})`, 'i')

interface PrecedenceMatchPattern {
  pattern: RegExp
  precedence: number
  extractDate: (
    field: DateValidationFieldInput['field'],
    match: RegExpMatchArray
  ) => string | null
}

// Higher precedence values represent stronger operative term language than
// header-style or summary-style date mentions. Keep this table intentionally
// narrow so the deterministic layer only wins when the clause text is clearly
// stronger than the surrounding competing labels.
const TERM_RANGE_PATTERNS: PrecedenceMatchPattern[] = [
  {
    pattern: new RegExp(
      `amended to read\\s*:?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 4,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : match[2] ?? null
  },
  {
    pattern: new RegExp(
      `deemed to read\\s*:?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 4,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : match[2] ?? null
  },
  {
    pattern: new RegExp(
      `(?:shall|is)\\s+(?:be\\s+)?(?:amended|extended)[\\s\\S]{0,120}?through\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 4,
    extractDate: (field, match) =>
      field === 'contractEndDate' ? match[1] ?? null : null
  },
  {
    pattern: new RegExp(
      `continue in full force and effect through\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 3,
    extractDate: (field, match) =>
      field === 'contractEndDate' ? match[1] ?? null : null
  },
  {
    pattern: new RegExp(
      `term of this agreement is\\s*:?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 2,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : match[2] ?? null
  },
  {
    pattern: new RegExp(
      `term of this contract shall be[\\s\\S]{0,120}?from\\s*(${DATE_PATTERN})[\\s\\S]{0,80}?through\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 2,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : match[2] ?? null
  },
  {
    pattern: new RegExp(
      `contract year,?\\s*(${DATE_PATTERN})\\s*(?:through|to|-)\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 2,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : match[2] ?? null
  },
  {
    pattern: new RegExp(
      `will become effective\\s*(${DATE_PATTERN})[\\s\\S]{0,200}?through\\s*(${DATE_PATTERN})`,
      'i'
    ),
    precedence: 2,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : match[2] ?? null
  },
  {
    pattern: new RegExp(`term begins on\\s*(${DATE_PATTERN})`, 'i'),
    precedence: 2,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : null
  },
  {
    pattern: new RegExp(`term starts on\\s*(${DATE_PATTERN})`, 'i'),
    precedence: 2,
    extractDate: (field, match) =>
      field === 'contractStartDate' ? match[1] ?? null : null
  },
  {
    pattern: new RegExp(`term (?:ends|expires) on\\s*(${DATE_PATTERN})`, 'i'),
    precedence: 2,
    extractDate: (field, match) =>
      field === 'contractEndDate' ? match[1] ?? null : null
  }
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
    {
      date: string
      chunks: DateValidationCitationInput[]
      precedence: number
    }
  >()

  for (const chunk of chunks) {
    if (field === 'contractStartDate') {
      for (const amendmentEffectiveDate of extractOperativeAmendmentEffectiveDates(
        chunk.text
      )) {
        const canonicalDate = canonicalizeDateToken(amendmentEffectiveDate)

        if (!canonicalDate) {
          continue
        }

        const existing = resolvedDates.get(canonicalDate)

        if (existing) {
          existing.precedence = Math.max(existing.precedence, 5)
          if (
            !existing.chunks.some((candidate) => candidate.chunkId === chunk.chunkId)
          ) {
            existing.chunks.push(chunk)
          }
          continue
        }

        resolvedDates.set(canonicalDate, {
          date: canonicalDate,
          chunks: [chunk],
          precedence: 5
        })
      }
    }

    for (const pattern of TERM_RANGE_PATTERNS) {
      const match = chunk.text.match(pattern.pattern)

      if (!match) {
        continue
      }

      if (
        field === 'contractEndDate' &&
        hasImmediateTrailingDateToken(chunk.text, match)
      ) {
        // OCR can concatenate a second end date directly after the matched
        // clause date (for example "...2022December 31, 2023"), which would
        // otherwise look like a clean single end-date read. Ignore those
        // matches so callers keep the field in an ambiguity path instead.
        continue
      }

      const rangeDate = pattern.extractDate(field, match)

      if (!rangeDate) {
        continue
      }

      const canonicalDate = canonicalizeDateToken(rangeDate)

      if (!canonicalDate) {
        continue
      }

      const existing = resolvedDates.get(canonicalDate)

      if (existing) {
        existing.precedence = Math.max(existing.precedence, pattern.precedence)
        if (!existing.chunks.some((candidate) => candidate.chunkId === chunk.chunkId)) {
          existing.chunks.push(chunk)
        }
        continue
      }

      resolvedDates.set(canonicalDate, {
        date: canonicalDate,
        chunks: [chunk],
        precedence: pattern.precedence
      })
    }
  }

  if (resolvedDates.size === 0) {
    return null
  }

  const highestPrecedence = Math.max(
    ...[...resolvedDates.values()].map((resolvedDate) => resolvedDate.precedence)
  )
  const highestPrecedenceDates = [...resolvedDates.values()].filter(
    (resolvedDate) => resolvedDate.precedence === highestPrecedence
  )

  // Only let clause-precedence cues break a conflict when one unique strongest
  // reading remains. If equally strong operative clauses disagree, callers
  // should keep the field in a conservative conflict/not-enough-evidence state.
  if (highestPrecedenceDates.length !== 1) {
    return null
  }

  return highestPrecedenceDates[0] ?? null
}

function hasImmediateTrailingDateToken(
  text: string,
  match: RegExpMatchArray
): boolean {
  if (match.index == null) {
    return false
  }

  const trailingText = text.slice(match.index + match[0].length)

  return DATE_AT_START_PATTERN.test(trailingText)
}
