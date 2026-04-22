import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createOcrFallbackPolicy,
  DEFAULT_DOCUMENT_INDEXING_CONCURRENCY,
  DIAGNOSTIC_FIRST_PASS_DOCUMENT_LIMIT,
  LARGE_BATCH_OCR_FALLBACK_LIMIT,
  LARGE_BATCH_OCR_TRIGGER_DOCUMENT_COUNT,
  mapWithConcurrencyLimit,
  scoreValidationDocuments
} from './validationHandler'

test('mapWithConcurrencyLimit preserves order while bounding active work', async () => {
  const items = [0, 1, 2, 3, 4]
  let active = 0
  let maxActive = 0

  const results = await mapWithConcurrencyLimit(
    items,
    DEFAULT_DOCUMENT_INDEXING_CONCURRENCY,
    async (item) => {
      active += 1
      maxActive = Math.max(maxActive, active)

      await new Promise((resolve) => setTimeout(resolve, 5 - item))

      active -= 1
      return item * 10
    }
  )

  assert.deepEqual(results, [0, 10, 20, 30, 40])
  assert.equal(maxActive, DEFAULT_DOCUMENT_INDEXING_CONCURRENCY)
})

test('mapWithConcurrencyLimit keeps draining remaining work after earlier items resolve', async () => {
  const completed: number[] = []

  const results = await mapWithConcurrencyLimit([0, 1, 2, 3], 2, async (item) => {
    await new Promise((resolve) => setTimeout(resolve, item === 0 ? 8 : 1))
    completed.push(item)

    return item
  })

  assert.deepEqual(results, [0, 1, 2, 3])
  assert.equal(completed.includes(3), true)
})

test('createOcrFallbackPolicy preserves OCR fallback for small submissions', () => {
  const shouldAttemptOcrFallback = createOcrFallbackPolicy(
    LARGE_BATCH_OCR_TRIGGER_DOCUMENT_COUNT - 1
  )

  assert.equal(shouldAttemptOcrFallback(), true)
  assert.equal(shouldAttemptOcrFallback(), true)
  assert.equal(shouldAttemptOcrFallback(), true)
})

test('createOcrFallbackPolicy caps OCR fallback for large submissions', () => {
  const shouldAttemptOcrFallback = createOcrFallbackPolicy(
    LARGE_BATCH_OCR_TRIGGER_DOCUMENT_COUNT
  )

  for (let index = 0; index < LARGE_BATCH_OCR_FALLBACK_LIMIT; index += 1) {
    assert.equal(shouldAttemptOcrFallback(), true)
  }

  assert.equal(shouldAttemptOcrFallback(), false)
})

test('scoreValidationDocuments is deterministic and does not reorder processing input', () => {
  const diagnostics = scoreValidationDocuments(
    [
      {
        documentName: 'rate-sheet-001.pdf',
        sourceBucket: 'uploads',
        sourceKey: 'contracts/rate-sheet-001.pdf'
      },
      {
        documentName: 'provider-contract-amendment-effective-dates.pdf',
        sourceBucket: 'uploads',
        sourceKey: 'contracts/provider-contract-amendment-effective-dates.pdf'
      }
    ],
    [
      {
        field: 'contractStartDate',
        label: 'Contract Start Date',
        value: '01/01/2024'
      },
      {
        field: 'contractEndDate',
        label: 'Contract End Date',
        value: '12/31/2024'
      }
    ]
  )

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.document.documentName),
    [
      'rate-sheet-001.pdf',
      'provider-contract-amendment-effective-dates.pdf'
    ]
  )
  assert.equal(
    diagnostics[1].workSelection.priorityScore >
      diagnostics[0].workSelection.priorityScore,
    true
  )
  assert.match(
    diagnostics[1].workSelection.priorityReasons.join(' '),
    /contract-oriented/
  )
})

test('scoreValidationDocuments marks only the top ranked documents as first-pass', () => {
  const diagnostics = scoreValidationDocuments(
    Array.from(
      { length: DIAGNOSTIC_FIRST_PASS_DOCUMENT_LIMIT + 2 },
      (_, index) => ({
        documentName: `contract-${String(index + 1).padStart(3, '0')}.pdf`,
        sourceBucket: 'uploads',
        sourceKey: `contracts/contract-${String(index + 1).padStart(3, '0')}.pdf`
      })
    ),
    [
      {
        field: 'contractStartDate',
        label: 'Contract Start Date',
        value: '01/01/2024'
      }
    ]
  )

  assert.equal(
    diagnostics.filter(
      (diagnostic) => diagnostic.workSelection.bucket === 'first-pass'
    ).length,
    DIAGNOSTIC_FIRST_PASS_DOCUMENT_LIMIT
  )
  assert.equal(
    diagnostics.filter(
      (diagnostic) => diagnostic.workSelection.bucket === 'deferred'
    ).length,
    2
  )
})
