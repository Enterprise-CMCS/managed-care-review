import assert from 'node:assert/strict'
import test from 'node:test'
import { selectDiverseRetrievedChunks } from './opRagOrdering'

test('selectDiverseRetrievedChunks favors multiple documents before repeat chunks from one document', () => {
  const results = selectDiverseRetrievedChunks(
    [
      {
        id: 'a-0',
        score: 0.99,
        metadata: { documentName: 'a.pdf', order: 0, page: 1, text: 'a0' }
      },
      {
        id: 'a-1',
        score: 0.98,
        metadata: { documentName: 'a.pdf', order: 1, page: 1, text: 'a1' }
      },
      {
        id: 'b-0',
        score: 0.97,
        metadata: { documentName: 'b.pdf', order: 0, page: 1, text: 'b0' }
      },
      {
        id: 'c-0',
        score: 0.96,
        metadata: { documentName: 'c.pdf', order: 0, page: 1, text: 'c0' }
      }
    ],
    3,
    2
  )

  assert.deepEqual(
    results.map((result) => result.id),
    ['a-0', 'b-0', 'c-0']
  )
})

test('selectDiverseRetrievedChunks falls back to repeated chunks when there are not enough documents', () => {
  const results = selectDiverseRetrievedChunks(
    [
      {
        id: 'a-0',
        score: 0.99,
        metadata: { documentName: 'a.pdf', order: 0, page: 1, text: 'a0' }
      },
      {
        id: 'a-1',
        score: 0.98,
        metadata: { documentName: 'a.pdf', order: 1, page: 1, text: 'a1' }
      },
      {
        id: 'b-0',
        score: 0.97,
        metadata: { documentName: 'b.pdf', order: 0, page: 1, text: 'b0' }
      }
    ],
    3,
    2
  )

  assert.deepEqual(
    results.map((result) => result.id),
    ['a-0', 'b-0', 'a-1']
  )
})
