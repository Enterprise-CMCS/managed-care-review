import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createOcrFallbackPolicy,
  DEFAULT_DOCUMENT_INDEXING_CONCURRENCY,
  LARGE_BATCH_OCR_FALLBACK_LIMIT,
  LARGE_BATCH_OCR_TRIGGER_DOCUMENT_COUNT,
  mapWithConcurrencyLimit
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
