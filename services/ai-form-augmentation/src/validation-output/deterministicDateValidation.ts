import { dayjs } from '../../../../packages/dates/src/dayjs'
import type {
  DateValidationCitationInput,
  DateValidationFieldInput,
  DateValidationResult
} from '../prompts'
import { VALIDATION_FIELD_CONFIG } from '../validationFields'

type SupportedField = DateValidationFieldInput['field']
const KNOWN_LABEL_PATTERNS = Object.values(VALIDATION_FIELD_CONFIG).flatMap(
  (config) => config.labelPatterns
)

const MONTH_PATTERN =
  '(January|February|March|April|May|June|July|August|September|October|November|December|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
const SLASH_DATE_PATTERN = '\\d{1,2}/\\d{1,2}/\\d{4}'
const ISO_DATE_PATTERN = '\\d{4}-\\d{2}-\\d{2}'
const DATE_PATTERN_GLOBAL = new RegExp(
  `${MONTH_PATTERN}\\s+\\d{1,2},?\\s*\\d{4}|${SLASH_DATE_PATTERN}|${ISO_DATE_PATTERN}`,
  'gi'
)
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

function canonicalizeDateToken(value: string): string | null {
  const normalizedValue = normalizeWhitespace(value).replace(/\s*,\s*/g, ', ')
  const parsedDate = dayjs(normalizedValue, [...ACCEPTED_DATE_FORMATS], true)

  if (parsedDate.isValid()) {
    return parsedDate.format('MM/DD/YYYY')
  }

  return null
}

function normalizeDateToken(value: string): string {
  const canonicalDate = canonicalizeDateToken(value)

  if (canonicalDate) {
    return canonicalDate.toLowerCase()
  }

  return normalizeWhitespace(value)
    .replace(/\s*,\s*/g, ', ')
    .replace(/,\s*(\d{4})$/, ', $1')
    .toLowerCase()
}

function buildCitation(
  chunk: DateValidationCitationInput
): DateValidationResult['citations'][number] {
  return {
    chunkId: chunk.chunkId,
    documentName: chunk.documentName,
    page: chunk.page,
    ...(chunk.startPage != null ? { startPage: chunk.startPage } : {}),
    ...(chunk.endPage != null ? { endPage: chunk.endPage } : {}),
    order: chunk.order
  }
}

function extractLabeledDates(
  field: SupportedField,
  chunk: DateValidationCitationInput
): string[] {
  const labeledDates = new Set<string>()
  const lines = chunk.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const labelPattern of VALIDATION_FIELD_CONFIG[field].labelPatterns) {
    for (const [index, line] of lines.entries()) {
      if (!labelPattern.test(line)) {
        continue
      }

      const labelMatch = line.match(labelPattern)

      if (!labelMatch || labelMatch.index == null) {
        continue
      }

      const afterLabelText = [
        line.slice(labelMatch.index + labelMatch[0].length),
        lines[index + 1] ?? ''
      ].join(' ')
      const boundedAfterLabelText =
        truncateAtNextKnownLabel(afterLabelText) ?? afterLabelText
      const dateMatches = [
        ...boundedAfterLabelText.matchAll(DATE_PATTERN_GLOBAL)
      ]

      for (const dateMatch of dateMatches) {
        if (dateMatch[0]) {
          labeledDates.add(normalizeWhitespace(dateMatch[0]))
        }
      }
    }
  }

  return [...labeledDates]
}

function truncateAtNextKnownLabel(value: string): string | null {
  let earliestIndex: number | null = null

  for (const pattern of KNOWN_LABEL_PATTERNS) {
    const match = value.match(pattern)

    if (match?.index == null) {
      continue
    }

    earliestIndex =
      earliestIndex == null ? match.index : Math.min(earliestIndex, match.index)
  }

  if (earliestIndex == null) {
    return null
  }

  // Keep deterministic extraction inside the current label's local context.
  // This prevents nearby labels like amendment effective date or requested
  // expiration date from being mistaken as additional values for the field
  // currently being validated.
  return value.slice(0, earliestIndex)
}

export function runDeterministicDateValidation(input: {
  formFields: DateValidationFieldInput[]
  retrievedChunks: DateValidationCitationInput[]
}): {
  resolvedResults: DateValidationResult[]
  unresolvedFields: DateValidationFieldInput[]
} {
  const resolvedResults: DateValidationResult[] = []
  const unresolvedFields: DateValidationFieldInput[] = []

  for (const field of input.formFields) {
    const labeledCandidates = input.retrievedChunks.flatMap((chunk) => {
      const labeledDates = extractLabeledDates(field.field, chunk)

      if (labeledDates.length === 0) {
        return []
      }

      return labeledDates.map((labeledDate) => ({ chunk, labeledDate }))
    })

    if (labeledCandidates.length === 0) {
      unresolvedFields.push(field)
      continue
    }

    const uniqueCandidates = new Map<
      string,
      { labeledDate: string; chunks: DateValidationCitationInput[] }
    >()

    for (const { chunk, labeledDate } of labeledCandidates) {
      const normalizedDate = normalizeDateToken(labeledDate)
      const existingCandidate = uniqueCandidates.get(normalizedDate)

      if (existingCandidate) {
        existingCandidate.chunks.push(chunk)
        continue
      }

      uniqueCandidates.set(normalizedDate, {
        labeledDate,
        chunks: [chunk]
      })
    }

    if (uniqueCandidates.size > 1) {
      resolvedResults.push({
        field: field.field,
        outcome: 'not-enough-evidence',
        confidence: 'medium',
        message: `Document text contains multiple labeled ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} values in the retrieved evidence.`,
        decisionSource: 'deterministic',
        citations: [
          ...new Map(
            [...uniqueCandidates.values()]
              .flatMap((candidate) => candidate.chunks)
              .map((chunk) => [chunk.chunkId, buildCitation(chunk)])
          ).values()
        ]
      })
      continue
    }

    const normalizedExpected = normalizeDateToken(field.value)
    const [resolvedCandidate] = uniqueCandidates.values()
    const displayedLabeledDate =
      canonicalizeDateToken(resolvedCandidate.labeledDate) ??
      resolvedCandidate.labeledDate

    if (normalizeDateToken(resolvedCandidate.labeledDate) === normalizedExpected) {
      resolvedResults.push({
        field: field.field,
        outcome: 'match',
        confidence: 'high',
        message: `Document text labels ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} as ${field.value}.`,
        decisionSource: 'deterministic',
        citations: resolvedCandidate.chunks.map(buildCitation)
      })
      continue
    }

    resolvedResults.push({
      field: field.field,
      outcome: 'mismatch',
      confidence: 'high',
      message: `Document text labels ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} as ${displayedLabeledDate}, not ${field.value}.`,
      decisionSource: 'deterministic',
      citations: resolvedCandidate.chunks.map(buildCitation)
    })
  }

  return {
    resolvedResults,
    unresolvedFields
  }
}
