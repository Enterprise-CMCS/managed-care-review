import assert from 'node:assert/strict'
import test from 'node:test'
import { buildValidationResultArtifact } from './validationResultArtifact'

test('buildValidationResultArtifact keeps all-doc mode implicit by default', () => {
  const artifact = buildValidationResultArtifact('artifact-v1', 'form-hash-v1', [])

  assert.equal('workSelectionMode' in artifact, false)
  assert.equal('fieldWorkSelectionDiagnostics' in artifact, false)
})

test('buildValidationResultArtifact preserves document coverage diagnostics when present', () => {
  const artifact = buildValidationResultArtifact(
    'artifact-v1',
    'form-hash-v1',
    [],
    [],
    [],
    [
      {
        documentName: 'valid-contract.pdf',
        sourceBucket: 'uploads',
        sourceKey: 'contracts/valid-contract.pdf',
        status: 'processed',
        usable: true,
        chunkCount: 3,
        workSelection: {
          priorityScore: 18,
          priorityReasons: ['Filename/key looks contract-oriented.'],
          bucket: 'first-pass'
        },
        stage: 'embed'
      },
      {
        documentName: 'renamed-doc.pdf',
        sourceBucket: 'uploads',
        sourceKey: 'contracts/renamed-doc.pdf',
        status: 'failed',
        usable: false,
        chunkCount: 0,
        stage: 'parse',
        error: 'Invalid PDF'
      },
      {
        documentName: 'supporting-rate.docx',
        status: 'skipped',
        usable: false,
        chunkCount: 0,
        reason: 'missing-pdf-extension'
      }
    ],
    'gated-fallback',
    [
      {
        field: 'contractStartDate',
        evidenceSource: 'fallback',
        fallbackReasons: ['weak-field-evidence']
      }
    ]
  )

  assert.deepEqual(artifact.documentDiagnostics, [
    {
      documentName: 'valid-contract.pdf',
      sourceBucket: 'uploads',
      sourceKey: 'contracts/valid-contract.pdf',
      status: 'processed',
      usable: true,
      chunkCount: 3,
      workSelection: {
        priorityScore: 18,
        priorityReasons: ['Filename/key looks contract-oriented.'],
        bucket: 'first-pass'
      },
      stage: 'embed'
    },
    {
      documentName: 'renamed-doc.pdf',
      sourceBucket: 'uploads',
      sourceKey: 'contracts/renamed-doc.pdf',
      status: 'failed',
      usable: false,
      chunkCount: 0,
      stage: 'parse',
      error: 'Invalid PDF'
    },
    {
      documentName: 'supporting-rate.docx',
      status: 'skipped',
      usable: false,
      chunkCount: 0,
      reason: 'missing-pdf-extension'
    }
  ])
  assert.equal(artifact.workSelectionMode, 'gated-fallback')
  assert.deepEqual(artifact.fieldWorkSelectionDiagnostics, [
    {
      field: 'contractStartDate',
      evidenceSource: 'fallback',
      fallbackReasons: ['weak-field-evidence']
    }
  ])
})

test('buildValidationResultArtifact preserves phase timings when present', () => {
  const artifact = buildValidationResultArtifact(
    'artifact-v1',
    'form-hash-v1',
    [],
    [],
    [],
    [],
    'gated-first-pass',
    [],
    {
      fetch: 1,
      parse: 2,
      ocr: 3,
      chunk: 4,
      embed: 5,
      retrieval: 6,
      validation: 7
    }
  )

  assert.deepEqual(artifact.phaseTimingsMs, {
    fetch: 1,
    parse: 2,
    ocr: 3,
    chunk: 4,
    embed: 5,
    retrieval: 6,
    validation: 7
  })
})

test('buildValidationResultArtifact preserves lifecycle timing when present', () => {
  const artifact = buildValidationResultArtifact(
    'artifact-v1',
    'form-hash-v1',
    [],
    [],
    [],
    [],
    'gated-first-pass',
    [],
    undefined,
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

test('buildValidationResultArtifact preserves reranking diagnostics when present', () => {
  const artifact = buildValidationResultArtifact(
    'artifact-v1',
    'form-hash-v1',
    [],
    [],
    [],
    [],
    'gated-first-pass',
    [],
    undefined,
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
