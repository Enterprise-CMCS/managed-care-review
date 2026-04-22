import assert from 'node:assert/strict'
import test from 'node:test'
import { buildValidationResultArtifact } from './validationResultArtifact'

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
})
