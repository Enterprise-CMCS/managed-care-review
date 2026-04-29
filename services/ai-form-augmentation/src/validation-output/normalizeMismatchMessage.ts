import type {
  DateValidationCitationInput,
  DateValidationFieldInput,
  DateValidationResult
} from '../prompts'
import {
  buildConflictingDateDetail,
  resolveMultipleLabeledDatesFromChunks,
  resolveSupportedFieldDateFromChunks
} from './deterministicDateValidation'
import { VALIDATION_FIELD_CONFIG } from '../validationFields'
import { buildFieldSpecificMismatchMessage } from './mismatchMessage'

function normalizeDisplayedDate(value: string): string {
  return value.trim()
}

export function resolveDisplayedDocumentDateFromCitedChunks(input: {
  field: DateValidationFieldInput['field']
  retrievedChunks: DateValidationCitationInput[]
  citations: DateValidationResult['citations']
}): string | null {
  const citedChunkIds = new Set(input.citations.map((citation) => citation.chunkId))
  const citedChunks = input.retrievedChunks.filter((chunk) =>
    citedChunkIds.has(chunk.chunkId)
  )

  if (citedChunks.length === 0) {
    return null
  }

  return (
    resolveSupportedFieldDateFromChunks(input.field, citedChunks)?.date ?? null
  )
}

export function normalizeLlmValidationResult(input: {
  field: DateValidationFieldInput
  result: DateValidationResult
  retrievedChunks: DateValidationCitationInput[]
}): DateValidationResult {
  const { field, result, retrievedChunks } = input

  const citedChunkIds = new Set(result.citations.map((citation) => citation.chunkId))
  const citedChunks = retrievedChunks.filter((chunk) => citedChunkIds.has(chunk.chunkId))

  if (citedChunks.length === 0) {
    return result
  }

  if (result.outcome === 'not-enough-evidence') {
    // Keep LLM ambiguity user-facing when the cited evidence is genuinely
    // conflicting, but replace vague model prose with the same deterministic
    // conflict wording the Review page already expects.
    const conflictingDates = resolveMultipleLabeledDatesFromChunks(
      field.field,
      citedChunks
    )

    if (conflictingDates.length > 1) {
      return {
        ...result,
        message: buildConflictingDateDetail(field, conflictingDates)
      }
    }

    return result
  }

  if (result.outcome === 'match') {
    const fallbackDocumentDate =
      resolveSupportedFieldDateFromChunks(field.field, citedChunks)?.date

    if (fallbackDocumentDate == null) {
      return result
    }

    return {
      ...result,
      message: `Document text supports ${VALIDATION_FIELD_CONFIG[field.field].messageLabel} as ${fallbackDocumentDate}.`
    }
  }

  if (result.outcome !== 'mismatch') {
    return result
  }

  const fallbackDocumentDate =
    resolveSupportedFieldDateFromChunks(field.field, citedChunks)?.date

  if (fallbackDocumentDate == null) {
    return result
  }

  const displayedFormDate = normalizeDisplayedDate(field.value)

  return {
    ...result,
    message: buildFieldSpecificMismatchMessage({
      field,
      documentDate: fallbackDocumentDate,
      formDate: displayedFormDate
    })
  }
}

// Preserve the older helper name so nearby call sites and tests can migrate
// without widening this ticket into a broader API cleanup.
export const normalizeMismatchMessage = normalizeLlmValidationResult
