import type {
  DateValidationCitationInput,
  DateValidationFieldInput,
  DateValidationResult
} from '../prompts'

type SupportedField = DateValidationFieldInput['field']

const FIELD_CONFIG: Record<
  SupportedField,
  {
    labelPatterns: RegExp[]
    messageLabel: string
  }
> = {
  contractStartDate: {
    labelPatterns: [
      /\bSTART DATE\b/i,
      /\bEFFECTIVE DATE\b/i,
      /\bTERM BEGINS ON\b/i,
      /\bTERM STARTS ON\b/i
    ],
    messageLabel: 'start date'
  },
  contractEndDate: {
    labelPatterns: [
      /\bTHROUGH END DATE\b/i,
      /\bEND DATE\b/i,
      /\bTERM ENDS ON\b/i,
      /\bTERM EXPIRES ON\b/i
    ],
    messageLabel: 'end date'
  },
  amendmentEffectiveDate: {
    labelPatterns: [/Amendment effective date\s*:/i],
    messageLabel: 'amendment effective date'
  }
}

const MONTH_PATTERN =
  '(January|February|March|April|May|June|July|August|September|October|November|December)'
const DATE_PATTERN = new RegExp(
  `${MONTH_PATTERN}\\s+\\d{1,2},?\\s*\\d{4}`,
  'i'
)

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeDateToken(value: string): string {
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
    order: chunk.order
  }
}

function extractLabeledDate(
  field: SupportedField,
  chunk: DateValidationCitationInput
): string | null {
  for (const labelPattern of FIELD_CONFIG[field].labelPatterns) {
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

    if (normalizeDateToken(resolvedCandidate.labeledDate) === normalizedExpected) {
      resolvedResults.push({
        field: field.field,
        outcome: 'match',
        confidence: 'high',
        message: `Document text labels ${FIELD_CONFIG[field.field].messageLabel} as ${field.value}.`,
        decisionSource: 'deterministic',
        citations: resolvedCandidate.chunks.map(buildCitation)
      })
      continue
    }

    resolvedResults.push({
      field: field.field,
      outcome: 'mismatch',
      confidence: 'high',
      message: `Document text labels ${FIELD_CONFIG[field.field].messageLabel} as ${resolvedCandidate.labeledDate}, not ${field.value}.`,
      decisionSource: 'deterministic',
      citations: resolvedCandidate.chunks.map(buildCitation)
    })
  }

  return {
    resolvedResults,
    unresolvedFields
  }
}
