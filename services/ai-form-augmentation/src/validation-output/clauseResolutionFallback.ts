import type { ValidationRetrievalDiagnostic } from '../results'
import { hasClauseEvidenceForField } from '../retrieval'
import type {
  DateValidationCitationInput,
  DateValidationFieldInput,
  DateValidationResult
} from '../prompts'
import { resolveSingleTermRangeDateFromChunks } from './termRangeDateResolution'

export function shouldFallbackConflictingClauseResolutionToLlm(input: {
  field: DateValidationFieldInput['field']
  deterministicResult: DateValidationResult
  retrievedChunks: DateValidationCitationInput[]
  retrievalDiagnostic?: ValidationRetrievalDiagnostic | null
}): boolean {
  const {
    field,
    deterministicResult,
    retrievedChunks,
    retrievalDiagnostic
  } = input

  if (
    deterministicResult.decisionSource !== 'deterministic' ||
    deterministicResult.outcome !== 'not-enough-evidence'
  ) {
    return false
  }

  if (
    retrievalDiagnostic == null ||
    retrievalDiagnostic.competingDateCount <= 1 ||
    !retrievalDiagnostic.clauseEvidencePresentFinally ||
    !retrievalDiagnostic.clauseEvidenceAdded
  ) {
    return false
  }

  const clauseChunkIds = new Set(
    retrievedChunks
      .filter((chunk) => hasClauseEvidenceForField(field, chunk.text))
      .map((chunk) => chunk.chunkId)
  )

  if (clauseChunkIds.size === 0) {
    return false
  }

  const clauseChunks = retrievedChunks.filter((chunk) =>
    clauseChunkIds.has(chunk.chunkId)
  )
  const resolvedClauseDate = resolveSingleTermRangeDateFromChunks(
    field,
    clauseChunks
  )

  if (resolvedClauseDate == null) {
    return false
  }

  // Only defer when retrieval already found operative clause-heavy text that
  // the deterministic conflict result did not rely on. That keeps the fallback
  // focused on regex/preference misses instead of relitigating conflicts the
  // deterministic path already explained with clause evidence in hand.
  return deterministicResult.citations.every(
    (citation) => !clauseChunkIds.has(citation.chunkId)
  )
}
