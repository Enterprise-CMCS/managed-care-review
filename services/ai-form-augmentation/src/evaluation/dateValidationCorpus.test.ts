import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_DATE_VALIDATION_EVALUATION_SCENARIOS,
  LARGE_SUBMISSION_DATE_VALIDATION_SCENARIOS
} from './dateValidationCorpus'
import { getScenarioDocuments } from './dateValidationEvaluation'

test('large-submission scenario is opt-in and prod-shaped without proprietary fixtures', () => {
  const [scenario] = LARGE_SUBMISSION_DATE_VALIDATION_SCENARIOS

  assert.ok(scenario)
  assert.equal(
    DEFAULT_DATE_VALIDATION_EVALUATION_SCENARIOS.includes(scenario),
    false
  )

  const documents = getScenarioDocuments(scenario)
  const eligibleDocuments = documents.filter(
    (document) => document.disposition === 'eligible'
  )
  const skippedDocuments = documents.filter(
    (document) => document.disposition === 'skipped'
  )
  const failedDocuments = documents.filter(
    (document) => document.disposition === 'failed'
  )

  assert.equal(documents.length, 165)
  assert.equal(eligibleDocuments.length, 132)
  assert.equal(skippedDocuments.length, 32)
  assert.equal(failedDocuments.length, 1)
  assert.ok(documents.some((document) => document.tags.includes('oddly-named')))
  assert.ok(
    documents.some((document) => document.tags.includes('scanned-or-weak-text'))
  )
  assert.ok(
    documents.some((document) => document.tags.includes('unsupported-non-pdf'))
  )
  assert.ok(documents.some((document) => document.tags.includes('corrupt')))
  assert.ok(
    documents.every(
      (document) =>
        !document.fixturePath ||
        document.fixturePath.startsWith('fixtures/pdf/')
    )
  )
})
