import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCompletedValidationStatusArtifact,
  buildValidationStatusArtifact,
  buildFailedValidationStatusArtifact
} from './statusArtifact'

test('buildCompletedValidationStatusArtifact keeps all-doc mode implicit by default', () => {
  const artifact = buildCompletedValidationStatusArtifact('artifact-v1')

  assert.equal('workSelectionMode' in artifact, false)
})

test('buildFailedValidationStatusArtifact can include document failure diagnostics', () => {
  const artifact = buildFailedValidationStatusArtifact(
    'artifact-v1',
    'Validation could not index any usable documents for form form-123',
    [
      {
        documentName: 'bad-contract.pdf',
        sourceBucket: 'uploads',
        sourceKey: 'contracts/bad-contract.pdf',
        status: 'failed',
        usable: false,
        chunkCount: 0,
        stage: 'parse',
        error: 'Invalid PDF'
      }
    ],
    'gated-fallback'
  )

  assert.equal(artifact.stage, 'failed')
  assert.equal(
    artifact.error,
    'Validation could not index any usable documents for form form-123'
  )
  assert.deepEqual(artifact.documentDiagnostics, [
    {
      documentName: 'bad-contract.pdf',
      sourceBucket: 'uploads',
      sourceKey: 'contracts/bad-contract.pdf',
      status: 'failed',
      usable: false,
      chunkCount: 0,
      stage: 'parse',
      error: 'Invalid PDF'
    }
  ])
  assert.equal(artifact.workSelectionMode, 'gated-fallback')
})

test('buildCompletedValidationStatusArtifact preserves document coverage diagnostics when present', () => {
  const artifact = buildCompletedValidationStatusArtifact(
    'artifact-v1',
    [
      {
        documentName: 'valid-contract.pdf',
        sourceBucket: 'uploads',
        sourceKey: 'contracts/valid-contract.pdf',
        status: 'processed',
        usable: true,
        chunkCount: 4,
        stage: 'cache'
      }
    ],
    'gated-first-pass'
  )

  assert.equal(artifact.stage, 'complete')
  assert.equal(artifact.error, null)
  assert.deepEqual(artifact.documentDiagnostics, [
    {
      documentName: 'valid-contract.pdf',
      sourceBucket: 'uploads',
      sourceKey: 'contracts/valid-contract.pdf',
      status: 'processed',
      usable: true,
      chunkCount: 4,
      stage: 'cache'
    }
  ])
  assert.equal(artifact.workSelectionMode, 'gated-first-pass')
})

test('buildValidationStatusArtifact can include bounded indexing progress during parsing', () => {
  const artifact = buildValidationStatusArtifact(
    'parsing',
    'artifact-v1',
    null,
    [],
    'gated-first-pass',
    {
      completedDocuments: 3,
      totalDocuments: 12
    }
  )

  assert.equal(artifact.stage, 'parsing')
  assert.deepEqual(artifact.indexingProgress, {
    completedDocuments: 3,
    totalDocuments: 12
  })
  assert.equal(artifact.workSelectionMode, 'gated-first-pass')
})

test('buildCompletedValidationStatusArtifact preserves lifecycle timing when present', () => {
  const artifact = buildCompletedValidationStatusArtifact(
    'artifact-v1',
    [],
    'gated-first-pass',
    {
      triggerAcceptedAt: '2026-04-29T04:00:00.000Z',
      firstStatusWriteAt: '2026-04-29T04:00:03.000Z',
      firstIndexedArtifactAt: '2026-04-29T04:00:07.000Z',
      completedAt: '2026-04-29T04:00:10.000Z'
    }
  )

  assert.deepEqual(artifact.lifecycleTiming, {
    triggerAcceptedAt: '2026-04-29T04:00:00.000Z',
    firstStatusWriteAt: '2026-04-29T04:00:03.000Z',
    firstIndexedArtifactAt: '2026-04-29T04:00:07.000Z',
    completedAt: '2026-04-29T04:00:10.000Z'
  })
})

test('buildCompletedValidationStatusArtifact preserves reranking diagnostics when present', () => {
  const artifact = buildCompletedValidationStatusArtifact(
    'artifact-v1',
    [],
    'gated-first-pass',
    undefined,
    {
      candidateCount: 12,
      sampledDocumentCount: 10,
      cachedSampleCount: 4,
      freshSampleCount: 6,
      sampleUnavailableCount: 2,
      reusedDecisionCount: 3,
      llmRequestCount: 10,
      timedOutCount: 3,
      sampleFetchElapsedMs: 1234,
      llmElapsedMs: 5678,
      totalElapsedMs: 6789
    }
  )

  assert.deepEqual(artifact.rerankingDiagnostics, {
    candidateCount: 12,
    sampledDocumentCount: 10,
    cachedSampleCount: 4,
    freshSampleCount: 6,
    sampleUnavailableCount: 2,
    reusedDecisionCount: 3,
    llmRequestCount: 10,
    timedOutCount: 3,
    sampleFetchElapsedMs: 1234,
    llmElapsedMs: 5678,
    totalElapsedMs: 6789
  })
})
