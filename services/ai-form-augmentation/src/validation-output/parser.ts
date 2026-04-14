import type { DateValidationResult } from '../prompts'

export interface ParsedValidationOutput {
  results: DateValidationResult[]
  normalizedRawText: string
}

export function normalizeValidationResponse(rawText: string): string {
  const trimmed = rawText.trim()
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)

  if (fencedMatch?.[1] != null) {
    return fencedMatch[1].trim()
  }

  return trimmed
}

export function extractJsonArray(rawText: string): string {
  const startIndex = rawText.indexOf('[')
  const endIndex = rawText.lastIndexOf(']')

  // The current prompt contract asks for an array of validation results, so
  // the parser intentionally looks for the outermost JSON array first.
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error('Could not find a JSON array in the LLM response')
  }

  return rawText.slice(startIndex, endIndex + 1)
}

function isCitation(value: unknown): value is DateValidationResult['citations'][number] {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.chunkId === 'string' &&
    typeof candidate.documentName === 'string' &&
    (typeof candidate.page === 'number' || candidate.page === null) &&
    typeof candidate.order === 'number'
  )
}

function isDateValidationResult(value: unknown): value is DateValidationResult {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.field === 'string' &&
    (candidate.outcome === 'match' ||
      candidate.outcome === 'mismatch' ||
      candidate.outcome === 'not-enough-evidence') &&
    (candidate.confidence === 'high' ||
      candidate.confidence === 'medium' ||
      candidate.confidence === 'low') &&
    typeof candidate.message === 'string' &&
    Array.isArray(candidate.citations) &&
    candidate.citations.every(isCitation)
  )
}

export function parseValidationResponse(rawText: string): ParsedValidationOutput {
  // Real model output may still include fences or extra prose even when the
  // underlying JSON is correct, so normalize before extracting the payload.
  const normalizedRawText = normalizeValidationResponse(rawText)
  const jsonText = extractJsonArray(normalizedRawText)

  let parsed: unknown

  try {
    parsed = JSON.parse(jsonText)
  } catch (error) {
    throw new Error(`Failed to parse validation JSON: ${String(error)}`)
  }

  if (!Array.isArray(parsed) || !parsed.every(isDateValidationResult)) {
    throw new Error('Validation response JSON does not match the expected result shape')
  }

  return {
    results: parsed,
    normalizedRawText
  }
}
