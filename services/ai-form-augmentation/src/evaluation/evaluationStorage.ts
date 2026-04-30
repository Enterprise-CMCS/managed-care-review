import {
  CreateBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  S3Client,
  S3ServiceException
} from '@aws-sdk/client-s3'
import type { ArtifactS3ClientConfig } from '../s3'

const DEFAULT_EVALUATION_BUCKET = 'ai-form-augmentation-artifacts'
const DEFAULT_EVALUATION_REGION = 'us-east-1'
const DEFAULT_EVALUATION_ENDPOINT = 'http://127.0.0.1:4566'
const DEFAULT_EVALUATION_ACCESS_KEY_ID = 'test'
const DEFAULT_EVALUATION_SECRET_ACCESS_KEY = 'test' // pragma: allowlist secret
const LEGACY_EVALUATION_BUCKET_ENV = 'AI_VALIDATION_S3_BUCKET'

export interface EvaluationStorageConfig {
  bucket: string
  s3Config: ArtifactS3ClientConfig
}

export function getEvaluationStorageConfig(): EvaluationStorageConfig {
  return {
    // Prefer the same artifact-bucket env the worker/runtime already uses.
    // Keep the older evaluation-specific name as a compatibility fallback so
    // local evaluation scripts do not break during the cleanup transition.
    bucket:
      process.env.AI_VALIDATION_ARTIFACT_BUCKET ??
      process.env[LEGACY_EVALUATION_BUCKET_ENV] ??
      DEFAULT_EVALUATION_BUCKET,
    s3Config: {
      region:
        process.env.AI_VALIDATION_AWS_REGION ?? DEFAULT_EVALUATION_REGION,
      endpoint:
        process.env.AI_VALIDATION_S3_ENDPOINT ?? DEFAULT_EVALUATION_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId:
          process.env.AI_VALIDATION_AWS_ACCESS_KEY_ID ??
          DEFAULT_EVALUATION_ACCESS_KEY_ID,
        secretAccessKey:
          process.env.AI_VALIDATION_AWS_SECRET_ACCESS_KEY ??
          DEFAULT_EVALUATION_SECRET_ACCESS_KEY
      }
    }
  }
}

export async function assertEvaluationStorageReady(
  config: EvaluationStorageConfig
): Promise<void> {
  const client = new S3Client(config.s3Config)

  try {
    await client.send(new ListBucketsCommand({}))
  } catch (error) {
    throw new Error(buildLocalStackSetupMessage(config, error))
  }

  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket
      })
    )
  } catch (error) {
    throw new Error(buildMissingBucketMessage(config, error))
  }
}

export async function ensureEvaluationStorageReady(
  config: EvaluationStorageConfig
): Promise<void> {
  const client = new S3Client(config.s3Config)

  try {
    await client.send(new ListBucketsCommand({}))
  } catch (error) {
    throw new Error(buildLocalStackSetupMessage(config, error))
  }

  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: config.bucket
      })
    )
    return
  } catch (error) {
    if (!isMissingBucketError(error)) {
      throw new Error(buildMissingBucketMessage(config, error))
    }
  }

  try {
    await client.send(
      new CreateBucketCommand({
        Bucket: config.bucket
      })
    )
  } catch (error) {
    throw new Error(buildCreateBucketMessage(config, error))
  }
}

function buildLocalStackSetupMessage(
  config: EvaluationStorageConfig,
  error: unknown
): string {
  const endpoint = config.s3Config.endpoint ?? '(default AWS endpoint)'

  return [
    `Evaluation storage is not reachable at ${endpoint}.`,
    `Start LocalStack S3 and ensure bucket "${config.bucket}" is available.`,
    formatUnderlyingError(error)
  ].join(' ')
}

function buildMissingBucketMessage(
  config: EvaluationStorageConfig,
  error: unknown
): string {
  const endpoint = config.s3Config.endpoint ?? '(default AWS endpoint)'

  return [
    `Evaluation bucket "${config.bucket}" is not available at ${endpoint}.`,
    `Run the evaluation storage bootstrap first or create the bucket manually.`,
    formatUnderlyingError(error)
  ].join(' ')
}

function buildCreateBucketMessage(
  config: EvaluationStorageConfig,
  error: unknown
): string {
  return [
    `Failed to create evaluation bucket "${config.bucket}".`,
    formatUnderlyingError(error)
  ].join(' ')
}

function isMissingBucketError(error: unknown): boolean {
  if (!(error instanceof S3ServiceException)) {
    return false
  }

  return error.name === 'NotFound' || error.$metadata.httpStatusCode === 404
}

function formatUnderlyingError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return `Underlying error: ${error.message}`
  }

  return 'Underlying error: Unknown S3 connectivity failure.'
}
