import assert from 'node:assert/strict'
import test from 'node:test'
import { getEvaluationStorageConfig } from './evaluationStorage'

function withEnv(
  values: Record<string, string | undefined>,
  run: () => void
): void {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key])

    if (value == null) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    run()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value == null) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

test('getEvaluationStorageConfig prefers AI_VALIDATION_ARTIFACT_BUCKET', () => {
  withEnv(
    {
      AI_VALIDATION_ARTIFACT_BUCKET: 'runtime-artifacts',
      AI_VALIDATION_S3_BUCKET: 'legacy-evaluation-bucket'
    },
    () => {
      const config = getEvaluationStorageConfig()

      assert.equal(config.bucket, 'runtime-artifacts')
    }
  )
})

test('getEvaluationStorageConfig falls back to legacy evaluation bucket env', () => {
  withEnv(
    {
      AI_VALIDATION_ARTIFACT_BUCKET: undefined,
      AI_VALIDATION_S3_BUCKET: 'legacy-evaluation-bucket'
    },
    () => {
      const config = getEvaluationStorageConfig()

      assert.equal(config.bucket, 'legacy-evaluation-bucket')
    }
  )
})

test('getEvaluationStorageConfig keeps existing local defaults when bucket envs are unset', () => {
  withEnv(
    {
      AI_VALIDATION_ARTIFACT_BUCKET: undefined,
      AI_VALIDATION_S3_BUCKET: undefined,
      AI_VALIDATION_AWS_REGION: undefined,
      AI_VALIDATION_S3_ENDPOINT: undefined,
      AI_VALIDATION_AWS_ACCESS_KEY_ID: undefined,
      AI_VALIDATION_AWS_SECRET_ACCESS_KEY: undefined
    },
    () => {
      const config = getEvaluationStorageConfig()

      assert.deepEqual(config, {
        bucket: 'ai-form-augmentation-artifacts',
        s3Config: {
          region: 'us-east-1',
          endpoint: 'http://127.0.0.1:4566',
          forcePathStyle: true,
          credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test' // pragma: allowlist secret
          }
        }
      })
    }
  )
})
