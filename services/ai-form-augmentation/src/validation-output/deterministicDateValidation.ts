import { dayjs } from '../../../../packages/dates/src/dayjs'
import type {
  DateValidationCitationInput,
  DateValidationFieldInput,
  DateValidationResult
} from '../prompts'
import { VALIDATION_FIELD_CONFIG } from '../validationFields'

type SupportedField = DateValidationFieldInput['field']

const MONTH_PATTERN =
  '(January|February|March|April|May|June|July|August|September|October|November|December|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
const SLASH_DATE_PATTERN = '\\d{1,2}/\\d{1,2}/\\d{4}'
const ISO_DATE_PATTERN = '\\d{4}-\\d{2}-\\d{2}'
const DATE_PATTERN = new RegExp(
  `${MONTH_PATTERN}\\s+\\d{1,2},?\\s*\\d{4}|${SLASH_DATE_PATTERN}|${ISO_DATE_PATTERN}`,
  'i'
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

function extractLabeledDate(
  field: SupportedField,
  chunk: DateValidationCitationInput
): string | null {
  for (const labelPattern of VALIDATION_FIELD_CONFIG[field].labelPatterns) {
    const labelMatch = chunk.text.match(labelPattern)

    if (!labelMatch || labelMatch.index == null) {
      continue
    }

    const afterLabelText = chunk.text.slice(
      labelMatch.index + labelMatch[0].length
    )
    const dateMatch = afterLabelText
      .slice(0, 80)
      .match(DATE_PATTERN)

    if (dateMatch?.[0]) {
      return normalizeWhitespace(dateMatch[0])
    }
  }

  return null
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
      const labeledDate = extractLabeledDate(field.field, chunk)

      if (!labeledDate) {
        return []
      }

      return [{ chunk, labeledDate }]
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
      unresolvedFields.push(field)
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
