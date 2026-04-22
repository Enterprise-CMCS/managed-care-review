import type { DocumentChunk } from '../chunking'
import type { DateValidationFieldInput } from '../prompts'
import { VALIDATION_FIELD_CONFIG } from '../validationFields'

export interface RetrievalEvidenceChunk {
  chunkId: string
  documentName: string
  order: number
  page: number | null
  startPage: number | null
  endPage: number | null
  text: string
}

export interface FieldRetrievalDiagnostics {
  field: DateValidationFieldInput['field']
  candidateChunkCount: number
  initialChunkCount: number
  finalChunkCount: number
  representedDocumentCount: number
  droppedCandidateCount: number
  competingDateCount: number
  clauseEvidencePresentInitially: boolean
  clauseEvidencePresentFinally: boolean
  clauseEvidenceAdded: boolean
}

const DATE_PATTERN =
  /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s*\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/gi

const CLAUSE_CUE_PATTERNS: Array<{
  pattern: RegExp
  fields: DateValidationFieldInput['field'][]
}> = [
  {
    pattern:
      /\b(?:shall|is)\s+(?:be\s+)?(?:amended|extended|renewed)\b|\bamended to read\b|\bdeemed to read\b/i,
    fields: ['contractStartDate', 'contractEndDate']
  },
  {
    pattern:
      /\bcontinue in full force and effect through\b|\bshall remain in full force and effect\b/i,
    fields: ['contractEndDate']
  },
  {
    pattern:
      /\bterm of this (?:agreement|contract)\b|\bterm begins on\b|\bterm starts on\b|\bterm (?:ends|expires) on\b/i,
    fields: ['contractStartDate', 'contractEndDate']
  },
  {
    pattern: /\bsupersed(?:e|es|ed|ing)\b|\breplace(?:s|d)?\b|\bnotwithstanding\b/i,
    fields: ['contractStartDate', 'contractEndDate']
  }
]

export function buildFieldRetrievalQuery(
  field: DateValidationFieldInput['field']
): string {
  return VALIDATION_FIELD_CONFIG[field].retrievalQuery
}

export function expandClauseEvidenceForField(input: {
  field: DateValidationFieldInput['field']
  candidateChunkCount: number
  retrievedChunks: RetrievalEvidenceChunk[]
  allChunks: DocumentChunk[]
}): {
  chunks: RetrievalEvidenceChunk[]
  diagnostics: FieldRetrievalDiagnostics
} {
  const competingDateCount = countCompetingLabeledDates(
    input.field,
    input.retrievedChunks
  )
  const clauseEvidencePresentInitially = input.retrievedChunks.some((chunk) =>
    hasClauseEvidenceForField(input.field, chunk.text)
  )

  if (
    input.field === 'amendmentEffectiveDate' ||
    (clauseEvidencePresentInitially && competingDateCount <= 1)
  ) {
    return {
      chunks: input.retrievedChunks,
      diagnostics: {
        field: input.field,
        candidateChunkCount: input.candidateChunkCount,
        initialChunkCount: input.retrievedChunks.length,
        finalChunkCount: input.retrievedChunks.length,
        representedDocumentCount: new Set(
          input.retrievedChunks.map((chunk) => chunk.documentName)
        ).size,
        droppedCandidateCount:
          input.candidateChunkCount - input.retrievedChunks.length,
        competingDateCount,
        clauseEvidencePresentInitially,
        clauseEvidencePresentFinally: clauseEvidencePresentInitially,
        clauseEvidenceAdded: false
      }
    }
  }

  const selectedChunkIds = new Set(
    input.retrievedChunks.map((chunk) => chunk.chunkId)
  )
  const candidateChunks = rankClauseEvidenceCandidates(
    input.field,
    input.allChunks.filter((chunk) => !selectedChunkIds.has(chunk.chunkId))
  )

  const additionalChunks: RetrievalEvidenceChunk[] = []

  for (const candidate of candidateChunks) {
    if (additionalChunks.length >= 2) {
      break
    }

    // Keep this expansion intentionally small. The goal is to give clause
    // precedence logic one nearby operative clause when summary labels are
    // competing, not to replace the primary retrieval ranking entirely.
    additionalChunks.push(candidate.chunk)
    selectedChunkIds.add(candidate.chunk.chunkId)

    const neighboringChunk = findAdjacentChunk(
      candidate.chunk,
      input.allChunks,
      selectedChunkIds
    )

    if (neighboringChunk) {
      additionalChunks.push(neighboringChunk)
      selectedChunkIds.add(neighboringChunk.chunkId)
    }
  }

  const chunks = [...input.retrievedChunks, ...additionalChunks].sort(
    (left, right) => {
      if (left.documentName === right.documentName) {
        return left.order - right.order
      }

      return left.documentName.localeCompare(right.documentName)
    }
  )
  const clauseEvidencePresentFinally = chunks.some((chunk) =>
    hasClauseEvidenceForField(input.field, chunk.text)
  )

  return {
    chunks,
    diagnostics: {
      field: input.field,
      candidateChunkCount: input.candidateChunkCount,
      initialChunkCount: input.retrievedChunks.length,
      finalChunkCount: chunks.length,
      representedDocumentCount: new Set(
        chunks.map((chunk) => chunk.documentName)
      ).size,
      droppedCandidateCount:
        input.candidateChunkCount - input.retrievedChunks.length,
      competingDateCount,
      clauseEvidencePresentInitially,
      clauseEvidencePresentFinally,
      clauseEvidenceAdded:
        clauseEvidencePresentFinally && !clauseEvidencePresentInitially
    }
  }
}

function rankClauseEvidenceCandidates(
  field: DateValidationFieldInput['field'],
  chunks: DocumentChunk[]
): Array<{ chunk: DocumentChunk; score: number }> {
  return chunks
    .flatMap((chunk) => {
      const score = getClauseEvidenceScore(field, chunk.text)

      if (score === 0) {
        return []
      }

      return [{ chunk, score }]
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      if (left.chunk.documentName === right.chunk.documentName) {
        return left.chunk.order - right.chunk.order
      }

      return left.chunk.documentName.localeCompare(right.chunk.documentName)
    })
}

function findAdjacentChunk(
  chunk: DocumentChunk,
  allChunks: DocumentChunk[],
  selectedChunkIds: Set<string>
): DocumentChunk | null {
  const adjacentChunks = allChunks.filter(
    (candidate) =>
      candidate.documentName === chunk.documentName &&
      !selectedChunkIds.has(candidate.chunkId) &&
      Math.abs(candidate.order - chunk.order) === 1
  )

  if (adjacentChunks.length === 0) {
    return null
  }

  return (
    adjacentChunks.sort(
      (left, right) =>
        Math.abs(left.order - chunk.order) - Math.abs(right.order - chunk.order)
    )[0] ?? null
  )
}

function countCompetingLabeledDates(
  field: DateValidationFieldInput['field'],
  chunks: RetrievalEvidenceChunk[]
): number {
  const candidateDates = new Set<string>()

  for (const chunk of chunks) {
    for (const labeledDate of extractLabeledDates(field, chunk.text)) {
      candidateDates.add(labeledDate.toLowerCase())
    }
  }

  return candidateDates.size
}

function extractLabeledDates(
  field: DateValidationFieldInput['field'],
  text: string
): string[] {
  const labeledDates = new Set<string>()
  const lines = text
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

      const nearbyText = [
        line.slice(labelMatch.index + labelMatch[0].length),
        lines[index + 1] ?? ''
      ].join(' ')
      const dateMatches = [...nearbyText.matchAll(DATE_PATTERN)]

      for (const dateMatch of dateMatches) {
        if (dateMatch[0]) {
          labeledDates.add(dateMatch[0])
        }
      }
    }
  }

  return [...labeledDates]
}

export function hasClauseEvidenceForField(
  field: DateValidationFieldInput['field'],
  text: string
): boolean {
  return getClauseEvidenceScore(field, text) > 0
}

function getClauseEvidenceScore(
  field: DateValidationFieldInput['field'],
  text: string
): number {
  if (field === 'amendmentEffectiveDate') {
    return 0
  }

  const cueScore = CLAUSE_CUE_PATTERNS.reduce((score, cue) => {
    if (!cue.fields.includes(field) || !cue.pattern.test(text)) {
      return score
    }

    return score + 2
  }, 0)

  if (cueScore === 0) {
    // Date-heavy chunks without operative clause language are usually the
    // summary labels that already dominated the original retrieval results.
    return 0
  }

  const dateMatches = [...text.matchAll(DATE_PATTERN)]
  const dateScore =
    dateMatches.length >= 2 ? 2 : dateMatches.length === 1 ? 1 : 0

  return cueScore + dateScore
}
