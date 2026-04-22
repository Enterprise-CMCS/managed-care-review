import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCompletedValidationStatusArtifact,
  buildFailedValidationStatusArtifact
} from './statusArtifact'

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
    ]
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
})

test('buildCompletedValidationStatusArtifact preserves document coverage diagnostics when present', () => {
  const artifact = buildCompletedValidationStatusArtifact('artifact-v1', [
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
})
