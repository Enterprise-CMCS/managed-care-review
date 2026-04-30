import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isCompatibleReusableWorkSelectionMode,
  readReusableValidationResult
} from './validationCache'
import { ArtifactNotFoundError, type ArtifactS3Client } from '../s3'
import { buildValidationResultArtifact } from '../results'
import { buildCompletedValidationStatusArtifact } from '../status'

function createArtifactS3Client(
  artifacts: Record<string, unknown>
): ArtifactS3Client {
  return {
    async putJson(): Promise<void> {},
    async putText(): Promise<void> {},
    async putBuffer(): Promise<void> {},
    async getBuffer(): Promise<Buffer> {
      throw new Error('Not implemented for this test')
    },
    async getJson<T>(_bucket: string, key: string): Promise<T> {
      if (!(key in artifacts)) {
        throw new ArtifactNotFoundError('fixture-bucket', key)
      }

      return artifacts[key] as T
    }
  }
}

test('readReusableValidationResult returns a cached result when status and result match the current inputs', async () => {
  const cachedResult = await readReusableValidationResult({
    s3Client: createArtifactS3ClientWithCompleteResult(),
    bucket: 'fixture-bucket',
    formId: 'form-123',
    artifactVersion: 'artifact-v1',
    formSnapshotHash: 'form-hash-v1'
  })

  assert.equal(cachedResult?.artifactVersion, 'artifact-v1')
  assert.equal(cachedResult?.formSnapshotHash, 'form-hash-v1')
  assert.equal(cachedResult?.results.length, 1)
})

test('readReusableValidationResult keeps all-doc and gated runs separate', async () => {
  const cachedResult = await readReusableValidationResult({
    s3Client: createArtifactS3Client({
      'rag-indexes/form-123/status.json': {
        stage: 'complete',
        artifactVersion: 'artifact-v1',
        updatedAt: '2026-04-18T00:00:00.000Z',
        error: null,
        workSelectionMode: 'all-doc'
      },
      'rag-indexes/form-123/validation-result.json': {
        artifactVersion: 'artifact-v1',
        formSnapshotHash: 'form-hash-v1',
        workSelectionMode: 'all-doc',
        results: []
      }
    }),
    bucket: 'fixture-bucket',
    formId: 'form-123',
    artifactVersion: 'artifact-v1',
    formSnapshotHash: 'form-hash-v1',
    workSelectionMode: 'gated-first-pass'
  })

  assert.equal(cachedResult, null)
})

test('isCompatibleReusableWorkSelectionMode keeps all-doc strict and lets gated reuse gated-fallback', () => {
  assert.equal(isCompatibleReusableWorkSelectionMode('all-doc', 'all-doc'), true)
  assert.equal(
    isCompatibleReusableWorkSelectionMode('all-doc', 'gated-first-pass'),
    false
  )
  assert.equal(
    isCompatibleReusableWorkSelectionMode(
      'gated-first-pass',
      'gated-fallback'
    ),
    true
  )
})

test('readReusableValidationResult rejects cached results when the stored form snapshot hash is stale', async () => {
  const cachedResult = await readReusableValidationResult({
    s3Client: createArtifactS3Client({
      'rag-indexes/form-123/status.json': {
        stage: 'complete',
        artifactVersion: 'artifact-v1',
        updatedAt: '2026-04-18T00:00:00.000Z',
        error: null
      },
      'rag-indexes/form-123/validation-result.json': {
        artifactVersion: 'artifact-v1',
        formSnapshotHash: 'stale-form-hash',
        results: []
      }
    }),
    bucket: 'fixture-bucket',
    formId: 'form-123',
    artifactVersion: 'artifact-v1',
    formSnapshotHash: 'form-hash-v1'
  })

  assert.equal(cachedResult, null)
})

test('readReusableValidationResult rejects cached results when the prior run did not complete', async () => {
  const cachedResult = await readReusableValidationResult({
    s3Client: createArtifactS3Client({
      'rag-indexes/form-123/status.json': {
        stage: 'failed',
        artifactVersion: 'artifact-v1',
        updatedAt: '2026-04-18T00:00:00.000Z',
        error: 'boom'
      },
      'rag-indexes/form-123/validation-result.json': {
        artifactVersion: 'artifact-v1',
        formSnapshotHash: 'form-hash-v1',
        results: []
      }
    }),
    bucket: 'fixture-bucket',
    formId: 'form-123',
    artifactVersion: 'artifact-v1',
    formSnapshotHash: 'form-hash-v1'
  })

  assert.equal(cachedResult, null)
})

function createArtifactS3ClientWithCompleteResult(): ArtifactS3Client {
  return createArtifactS3Client({
    'rag-indexes/form-123/status.json': buildCompletedValidationStatusArtifact(
      'artifact-v1'
    ),
    'rag-indexes/form-123/validation-result.json': buildValidationResultArtifact(
      'artifact-v1',
      'form-hash-v1',
      [
        {
          field: 'contractStartDate',
          outcome: 'match',
          confidence: 'high',
          message: 'Document text supports start date as 01/01/2024.',
          decisionSource: 'deterministic',
          citations: []
        }
      ]
    )
  })
}
