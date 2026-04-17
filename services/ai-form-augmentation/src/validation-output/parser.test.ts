import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseValidationResponse,
  ValidationResponseParseError
} from './parser'

test('parseValidationResponse accepts a one-element result array', () => {
  const parsed = parseValidationResponse(`[
    {
      "field": "contractStartDate",
      "outcome": "match",
      "confidence": "high",
      "message": "Matched the labeled start date.",
      "citations": [
        {
          "chunkId": "chunk-1",
          "documentName": "fixture.pdf",
          "page": 1,
          "startPage": 1,
          "endPage": 1,
          "order": 0
        }
      ]
    }
  ]`)

  assert.equal(parsed.results.length, 1)
  assert.equal(parsed.results[0]?.field, 'contractStartDate')
})

test('parseValidationResponse recovers a single bare result object', () => {
  const parsed = parseValidationResponse(`{
    "field": "contractEndDate",
    "outcome": "not-enough-evidence",
    "confidence": "low",
    "message": "No defensible end date was found.",
    "citations": []
  }`)

  assert.equal(parsed.results.length, 1)
  assert.equal(parsed.results[0]?.field, 'contractEndDate')
  assert.equal(parsed.results[0]?.outcome, 'not-enough-evidence')
})

test('parseValidationResponse still fails for invalid result shapes', () => {
  assert.throws(
    () =>
      parseValidationResponse(`{
        "field": "contractStartDate",
        "outcome": "match",
        "message": "Missing confidence and citations."
      }`),
    (error: unknown) =>
      error instanceof ValidationResponseParseError &&
      error.issue === 'invalid-result-shape'
  )
})
