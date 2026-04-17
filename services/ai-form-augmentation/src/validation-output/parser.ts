import type { DateValidationResult } from '../prompts'

export type ValidationResponseIssue =
  | 'missing-json-array'
  | 'invalid-json'
  | 'invalid-result-shape'

export interface ParsedValidationOutput {
  results: DateValidationResult[]
  normalizedRawText: string
}

export class ValidationResponseParseError extends Error {
  readonly issue: ValidationResponseIssue

  constructor(issue: ValidationResponseIssue, message: string) {
    super(message)
    this.name = 'ValidationResponseParseError'
    this.issue = issue
  }
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
    throw new ValidationResponseParseError(
      'missing-json-array',
      'Could not find a JSON array in the LLM response'
    )
  }

  return rawText.slice(startIndex, endIndex + 1)
}

function extractJsonObject(rawText: string): string {
  const startIndex = rawText.indexOf('{')
  const endIndex = rawText.lastIndexOf('}')

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new ValidationResponseParseError(
      'missing-json-array',
      'Could not find a JSON object in the LLM response'
    )
  }

  return rawText.slice(startIndex, endIndex + 1)
}

function getPreferredJsonShape(rawText: string): 'array' | 'object' | null {
  const arrayStartIndex = rawText.indexOf('[')
  const objectStartIndex = rawText.indexOf('{')

  if (arrayStartIndex === -1 && objectStartIndex === -1) {
    return null
  }

  if (arrayStartIndex === -1) {
    return 'object'
  }

  if (objectStartIndex === -1) {
    return 'array'
  }

  // Prefer the first top-level JSON opener we can see so a bare result object
  // with nested citations: [] does not get misread as an empty result array.
  return arrayStartIndex < objectStartIndex ? 'array' : 'object'
}

function parseJsonText(jsonText: string): unknown {
  try {
    return JSON.parse(jsonText)
  } catch (error) {
    throw new ValidationResponseParseError(
      'invalid-json',
      `Failed to parse validation JSON: ${String(error)}`
    )
  }
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
    (candidate.startPage === undefined ||
      typeof candidate.startPage === 'number' ||
      candidate.startPage === null) &&
    (candidate.endPage === undefined ||
      typeof candidate.endPage === 'number' ||
      candidate.endPage === null) &&
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
  const preferredJsonShape = getPreferredJsonShape(normalizedRawText)

  if (preferredJsonShape == null) {
    throw new ValidationResponseParseError(
      'missing-json-array',
      'Could not find a JSON array in the LLM response'
    )
  }

  let parsed: unknown

  if (preferredJsonShape === 'object') {
    try {
      parsed = parseJsonText(extractJsonObject(normalizedRawText))
    } catch (error) {
      if (
        !(error instanceof ValidationResponseParseError) ||
        error.issue !== 'missing-json-array'
      ) {
        throw error
      }

      parsed = parseJsonText(extractJsonArray(normalizedRawText))
    }
  } else {
    try {
      parsed = parseJsonText(extractJsonArray(normalizedRawText))
    } catch (error) {
      if (
        !(error instanceof ValidationResponseParseError) ||
        error.issue !== 'missing-json-array'
      ) {
        throw error
      }

      parsed = parseJsonText(extractJsonObject(normalizedRawText))
    }
  }

  if (isDateValidationResult(parsed)) {
    return {
      results: [parsed],
      normalizedRawText
    }
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    !parsed.every(isDateValidationResult)
  ) {
    throw new ValidationResponseParseError(
      'invalid-result-shape',
      'Validation response JSON does not match the expected result shape'
    )
  }

  return {
    results: parsed,
    normalizedRawText
  }
}
