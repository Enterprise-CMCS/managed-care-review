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
