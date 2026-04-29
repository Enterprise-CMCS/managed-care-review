import type {
  DateValidationCitationInput,
  DateValidationFieldInput,
  DateValidationResult
} from '../prompts'
import { hasClauseEvidenceForField } from '../retrieval'
import { VALIDATION_FIELD_CONFIG } from '../validationFields'
import { canonicalizeDateToken } from './dateToken'
import { buildFieldSpecificMismatchMessage } from './mismatchMessage'
import { extractOperativeAmendmentEffectiveDates } from './amendmentEffectiveDateSignal'
import { resolveSingleTermRangeDateFromChunks } from './termRangeDateResolution'

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
function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
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

export interface ResolvedSupportedFieldDate {
  date: string
  chunks: DateValidationCitationInput[]
}

function buildConflictingDateMessage(
  field: DateValidationFieldInput
): string {
  return `Document contains conflicting ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} evidence, so the ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} could not be verified.`
}

export function buildConflictingDateDetail(
  field: DateValidationFieldInput,
  candidateDates: string[]
): string {
  if (candidateDates.length === 0) {
    return buildConflictingDateMessage(field)
  }

  if (candidateDates.length === 1) {
    return `${buildConflictingDateMessage(field)} Conflicting date found: ${candidateDates[0]}.`
  }

  const listedDates =
    candidateDates.length === 2
      ? `${candidateDates[0]} and ${candidateDates[1]}`
      : `${candidateDates.slice(0, -1).join(', ')}, and ${candidateDates[candidateDates.length - 1]}`

  return `${buildConflictingDateMessage(field)} Conflicting dates found: ${listedDates}.`
}

export function resolveMultipleLabeledDatesFromChunks(
  field: SupportedField,
  chunks: DateValidationCitationInput[]
): string[] {
  const candidateDates = new Set<string>()

  for (const chunk of chunks) {
    for (const labeledDate of extractLabeledDates(field, chunk)) {
      candidateDates.add(canonicalizeDateToken(labeledDate) ?? labeledDate)
    }
  }

  return [...candidateDates].sort()
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

  if (field === 'contractStartDate') {
    for (const amendmentEffectiveDate of extractOperativeAmendmentEffectiveDates(
      chunk.text
    )) {
      labeledDates.add(amendmentEffectiveDate)
    }
  }

  return [...labeledDates]
}

function extractClauseDateCandidates(
  field: SupportedField,
  chunks: DateValidationCitationInput[]
): string[] {
  const candidateDates = new Set<string>()

  for (const chunk of chunks) {
    const canonicalDates = [...chunk.text.matchAll(DATE_PATTERN_GLOBAL)]
      .flatMap((match) => {
        const value = match[0]?.trim()

        if (!value) {
          return []
        }

        const canonicalDate = canonicalizeDateToken(value)
        return canonicalDate ? [canonicalDate] : []
      })

    if (field === 'contractStartDate') {
      const firstDate = canonicalDates[0]

      if (firstDate) {
        candidateDates.add(firstDate)
      }

      continue
    }

    const trailingDates =
      canonicalDates.length > 1 ? canonicalDates.slice(1) : canonicalDates

    for (const date of trailingDates) {
      candidateDates.add(date)
    }
  }

  return [...candidateDates].sort()
}

export function resolveSingleLabeledDateFromChunks(
  field: SupportedField,
  chunks: DateValidationCitationInput[]
): string | null {
  const uniqueCandidates = new Map<string, string>()

  for (const chunk of chunks) {
    for (const labeledDate of extractLabeledDates(field, chunk)) {
      const normalizedDate = normalizeDateToken(labeledDate)

      if (!uniqueCandidates.has(normalizedDate)) {
        uniqueCandidates.set(normalizedDate, labeledDate)
      }
    }
  }

  if (uniqueCandidates.size !== 1) {
    return null
  }

  const [resolvedCandidate] = uniqueCandidates.values()
  return canonicalizeDateToken(resolvedCandidate) ?? resolvedCandidate
}

export function resolveSupportedFieldDateFromChunks(
  field: SupportedField,
  chunks: DateValidationCitationInput[]
): ResolvedSupportedFieldDate | null {
  const uniqueCandidates = new Map<
    string,
    {
      date: string
      chunks: DateValidationCitationInput[]
    }
  >()

  for (const chunk of chunks) {
    for (const labeledDate of extractLabeledDates(field, chunk)) {
      const normalizedDate = normalizeDateToken(labeledDate)
      const resolvedDate = canonicalizeDateToken(labeledDate) ?? labeledDate
      const existing = uniqueCandidates.get(normalizedDate)

      if (existing) {
        if (!existing.chunks.some((candidate) => candidate.chunkId === chunk.chunkId)) {
          existing.chunks.push(chunk)
        }
        continue
      }

      uniqueCandidates.set(normalizedDate, {
        date: resolvedDate,
        chunks: [chunk]
      })
    }
  }

  if (uniqueCandidates.size === 1) {
    return [...uniqueCandidates.values()][0] ?? null
  }

  return resolveSingleTermRangeDateFromChunks(field, chunks)
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
      const clauseChunks = input.retrievedChunks.filter((chunk) =>
        hasClauseEvidenceForField(field.field, chunk.text)
      )

      // Some amendment fixtures surface only operative term-clause language and
      // never expose the scoped fields as explicit labels. Handle those here so
      // clause-only evidence can still resolve deterministically before the
      // worker falls back to the LLM path.
      const resolvedClauseDate = resolveSingleTermRangeDateFromChunks(
        field.field,
        clauseChunks
      )

      if (resolvedClauseDate) {
        const normalizedResolvedDate = normalizeDateToken(resolvedClauseDate.date)

        resolvedResults.push({
          field: field.field,
          outcome:
            normalizedResolvedDate === normalizeDateToken(field.value)
              ? 'match'
              : 'mismatch',
          confidence: 'high',
          message:
            normalizedResolvedDate === normalizeDateToken(field.value)
              ? `Document text supports ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} as ${field.value}.`
              : buildFieldSpecificMismatchMessage({
                  field,
                  documentDate: resolvedClauseDate.date,
                  formDate: field.value
                }),
          decisionSource: 'deterministic',
          citations: resolvedClauseDate.chunks.map(buildCitation)
        })
        continue
      }

      if (clauseChunks.length > 0) {
        const conflictingClauseDates = extractClauseDateCandidates(
          field.field,
          clauseChunks
        )

        if (conflictingClauseDates.length <= 1) {
          unresolvedFields.push(field)
          continue
        }

        // Keep OCR-weakened clause-only evidence conservative when it surfaces
        // multiple plausible dates but not one unique operative reading.
        resolvedResults.push({
          field: field.field,
          outcome: 'not-enough-evidence',
          confidence: 'medium',
          message: buildConflictingDateDetail(field, conflictingClauseDates),
          decisionSource: 'deterministic',
          citations: clauseChunks.map(buildCitation)
        })
        continue
      }

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
      const resolvedTermRange = resolveSingleTermRangeDateFromChunks(
        field.field,
        input.retrievedChunks
      )

      if (resolvedTermRange) {
        const normalizedResolvedDate = normalizeDateToken(resolvedTermRange.date)

        resolvedResults.push({
          field: field.field,
          outcome:
            normalizedResolvedDate === normalizeDateToken(field.value)
              ? 'match'
              : 'mismatch',
          confidence: 'high',
          message:
            normalizedResolvedDate === normalizeDateToken(field.value)
              ? `Document text supports ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} as ${field.value}.`
              : buildFieldSpecificMismatchMessage({
                  field,
                  documentDate: resolvedTermRange.date,
                  formDate: field.value
                }),
          decisionSource: 'deterministic',
          citations: resolvedTermRange.chunks.map(buildCitation)
        })
        continue
      }

      const conflictingDates = resolveMultipleLabeledDatesFromChunks(
        field.field,
        input.retrievedChunks
      )

      resolvedResults.push({
        field: field.field,
        outcome: 'not-enough-evidence',
        confidence: 'medium',
        message: buildConflictingDateDetail(field, conflictingDates),
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
    const resolvedTermRange = resolveSingleTermRangeDateFromChunks(
      field.field,
      input.retrievedChunks
    )
    const resolvedLabelDate = normalizeDateToken(resolvedCandidate.labeledDate)

    if (
      resolvedTermRange != null &&
      normalizeDateToken(resolvedTermRange.date) !== resolvedLabelDate
    ) {
      const normalizedResolvedDate = normalizeDateToken(resolvedTermRange.date)

      resolvedResults.push({
        field: field.field,
        outcome:
          normalizedResolvedDate === normalizedExpected ? 'match' : 'mismatch',
        confidence: 'high',
        message:
          normalizedResolvedDate === normalizedExpected
            ? `Document text supports ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} as ${field.value}.`
            : buildFieldSpecificMismatchMessage({
                field,
                documentDate: resolvedTermRange.date,
                formDate: field.value
              }),
        decisionSource: 'deterministic',
        citations: resolvedTermRange.chunks.map(buildCitation)
      })
      continue
    }

    const displayedLabeledDate =
      canonicalizeDateToken(resolvedCandidate.labeledDate) ??
      resolvedCandidate.labeledDate

    if (resolvedLabelDate === normalizedExpected) {
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
      message: buildFieldSpecificMismatchMessage({
        field,
        documentDate: displayedLabeledDate,
        formDate: field.value
      }),
      decisionSource: 'deterministic',
      citations: resolvedCandidate.chunks.map(buildCitation)
    })
  }

  return {
    resolvedResults,
    unresolvedFields
  }
}
