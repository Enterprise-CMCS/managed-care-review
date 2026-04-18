import assert from 'node:assert/strict'
import test from 'node:test'
import { shouldFallbackConflictingClauseResolutionToLlm } from './clauseResolutionFallback'

test('shouldFallbackConflictingClauseResolutionToLlm defers when clause evidence was retrieved but not used by deterministic conflict handling', () => {
  const shouldFallback = shouldFallbackConflictingClauseResolutionToLlm({
    field: 'contractEndDate',
    deterministicResult: {
      field: 'contractEndDate',
      outcome: 'not-enough-evidence',
      confidence: 'medium',
      message:
        'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2024 and 12/31/2025.',
      decisionSource: 'deterministic',
      citations: [
        {
          chunkId: 'summary-chunk',
          documentName: 'fixture.pdf',
          page: 1,
          order: 0
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'summary-chunk',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2024 Requested Contract Expiration Date: 12/31/2025'
      },
      {
        chunkId: 'clause-chunk',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'This amendment supersedes prior term summaries and shall continue in full force and effect through December 31, 2025.'
      }
    ],
    retrievalDiagnostic: {
      field: 'contractEndDate',
      initialChunkCount: 1,
      finalChunkCount: 2,
      competingDateCount: 2,
      clauseEvidencePresentInitially: false,
      clauseEvidencePresentFinally: true,
      clauseEvidenceAdded: true
    }
  })

  assert.equal(shouldFallback, true)
})

test('shouldFallbackConflictingClauseResolutionToLlm stays deterministic when added clause evidence still does not resolve one unique term date', () => {
  const shouldFallback = shouldFallbackConflictingClauseResolutionToLlm({
    field: 'contractEndDate',
    deterministicResult: {
      field: 'contractEndDate',
      outcome: 'not-enough-evidence',
      confidence: 'medium',
      message:
        'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2022 and 12/31/2023.',
      decisionSource: 'deterministic',
      citations: [
        {
          chunkId: 'summary-chunk',
          documentName: 'fixture.pdf',
          page: 1,
          order: 0
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'summary-chunk',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2022 Requested Contract Expiration Date: 12/31/2023'
      },
      {
        chunkId: 'clause-chunk',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'Paragraph 2 is amended to read: January 1, 2024 through December 31, 2022. Paragraph 2 is deemed to read: January 1, 2024 through December 31, 2023.'
      }
    ],
    retrievalDiagnostic: {
      field: 'contractEndDate',
      initialChunkCount: 1,
      finalChunkCount: 2,
      competingDateCount: 2,
      clauseEvidencePresentInitially: false,
      clauseEvidencePresentFinally: true,
      clauseEvidenceAdded: true
    }
  })

  assert.equal(shouldFallback, false)
})

test('shouldFallbackConflictingClauseResolutionToLlm stays deterministic when the conflict result already cites clause evidence', () => {
  const shouldFallback = shouldFallbackConflictingClauseResolutionToLlm({
    field: 'contractEndDate',
    deterministicResult: {
      field: 'contractEndDate',
      outcome: 'not-enough-evidence',
      confidence: 'medium',
      message:
        'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2025 and 12/31/2026.',
      decisionSource: 'deterministic',
      citations: [
        {
          chunkId: 'clause-chunk-a',
          documentName: 'fixture.pdf',
          page: 2,
          order: 1
        },
        {
          chunkId: 'clause-chunk-b',
          documentName: 'fixture.pdf',
          page: 3,
          order: 2
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'clause-chunk-a',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'Paragraph 2 is amended to read: January 1, 2024 through December 31, 2025.'
      },
      {
        chunkId: 'clause-chunk-b',
        documentName: 'fixture.pdf',
        page: 3,
        startPage: 3,
        endPage: 3,
        order: 2,
        text:
          'Paragraph 2 is deemed to read: January 1, 2024 through December 31, 2026.'
      }
    ],
    retrievalDiagnostic: {
      field: 'contractEndDate',
      initialChunkCount: 2,
      finalChunkCount: 2,
      competingDateCount: 2,
      clauseEvidencePresentInitially: true,
      clauseEvidencePresentFinally: true,
      clauseEvidenceAdded: false
    }
  })

  assert.equal(shouldFallback, false)
})

test('shouldFallbackConflictingClauseResolutionToLlm stays deterministic when clause evidence was already present before retrieval expansion', () => {
  const shouldFallback = shouldFallbackConflictingClauseResolutionToLlm({
    field: 'contractEndDate',
    deterministicResult: {
      field: 'contractEndDate',
      outcome: 'not-enough-evidence',
      confidence: 'medium',
      message:
        'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2022 and 12/31/2023.',
      decisionSource: 'deterministic',
      citations: [
        {
          chunkId: 'summary-chunk',
          documentName: 'fixture.pdf',
          page: 1,
          order: 0
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'summary-chunk',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2022 Requested Contract Expiration Date: 12/31/2023'
      },
      {
        chunkId: 'existing-clause-chunk',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'The contract contains superseding renewal language and remains in full force and effect through December 31, 2023.'
      }
    ],
    retrievalDiagnostic: {
      field: 'contractEndDate',
      initialChunkCount: 2,
      finalChunkCount: 2,
      competingDateCount: 2,
      clauseEvidencePresentInitially: true,
      clauseEvidencePresentFinally: true,
      clauseEvidenceAdded: false
    }
  })

  assert.equal(shouldFallback, false)
})
