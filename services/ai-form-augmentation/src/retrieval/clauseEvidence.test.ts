import assert from 'node:assert/strict'
import test from 'node:test'
import { expandClauseEvidenceForField } from './clauseEvidence'

test('expandClauseEvidenceForField adds clause-heavy evidence when competing end-date labels are retrieved first', () => {
  const result = expandClauseEvidenceForField({
    field: 'contractEndDate',
    candidateChunkCount: 1,
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2024 Current Contract Expiration Date: 12/31/2024 Requested Contract Expiration Date: 12/31/2025'
      }
    ],
    allChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        startChar: 0,
        endChar: 100,
        text:
          'Original Contract Expiration Date: 12/31/2024 Current Contract Expiration Date: 12/31/2024 Requested Contract Expiration Date: 12/31/2025'
      },
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        startChar: 101,
        endChar: 200,
        text:
          'Paragraph 2 is amended to read: January 1, 2024 through December 31, 2026.'
      }
    ]
  })

  assert.deepEqual(
    result.chunks.map((chunk) => chunk.chunkId),
    ['chunk-0', 'chunk-1']
  )
  assert.equal(result.diagnostics.candidateChunkCount, 1)
  assert.equal(result.diagnostics.competingDateCount, 2)
  assert.equal(result.diagnostics.representedDocumentCount, 1)
  assert.equal(result.diagnostics.droppedCandidateCount, 0)
  assert.equal(result.diagnostics.clauseEvidencePresentInitially, false)
  assert.equal(result.diagnostics.clauseEvidencePresentFinally, true)
  assert.equal(result.diagnostics.clauseEvidenceAdded, true)
})

test('expandClauseEvidenceForField keeps existing clause evidence without adding more noise', () => {
  const result = expandClauseEvidenceForField({
    field: 'contractStartDate',
    candidateChunkCount: 1,
    retrievedChunks: [
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'The term of this Contract shall be the Contract Year from January 1, 2024 through December 31, 2025.'
      }
    ],
    allChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        startChar: 0,
        endChar: 100,
        text: 'Contract Start Date: 01/01/2024'
      },
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        startChar: 101,
        endChar: 200,
        text:
          'The term of this Contract shall be the Contract Year from January 1, 2024 through December 31, 2025.'
      }
    ]
  })

  assert.deepEqual(
    result.chunks.map((chunk) => chunk.chunkId),
    ['chunk-1']
  )
  assert.equal(result.diagnostics.candidateChunkCount, 1)
  assert.equal(result.diagnostics.representedDocumentCount, 1)
  assert.equal(result.diagnostics.droppedCandidateCount, 0)
  assert.equal(result.diagnostics.clauseEvidencePresentInitially, true)
  assert.equal(result.diagnostics.clauseEvidenceAdded, false)
})
