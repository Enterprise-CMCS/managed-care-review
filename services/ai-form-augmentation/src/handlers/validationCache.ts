import type { ValidationResultArtifact } from '../results'
import { getValidationResultKey } from '../results'
import type { ArtifactS3Client } from '../s3'
import type { ValidationStatusArtifact } from '../status'
import { getValidationStatusKey } from '../status'
import type { ValidationWorkSelectionMode } from '../results'

export async function readReusableValidationResult(input: {
  s3Client: ArtifactS3Client
  bucket: string
  formId: string
  artifactVersion: string
  formSnapshotHash: string
  workSelectionMode?: Extract<
    ValidationWorkSelectionMode,
    'all-doc' | 'gated-first-pass'
  >
}): Promise<ValidationResultArtifact | null> {
  const [statusArtifact, resultArtifact] = await Promise.all([
    readOptionalArtifact<ValidationStatusArtifact>(
      input.s3Client,
      input.bucket,
      getValidationStatusKey(input.formId)
    ),
    readOptionalArtifact<ValidationResultArtifact>(
      input.s3Client,
      input.bucket,
      getValidationResultKey(input.formId)
    )
  ])

  // Reuse only fully completed artifacts. A missing, failed, or in-progress
  // prior run should fall back to the normal validation path instead of being
  // treated as a cache hit.
  if (
    statusArtifact == null ||
    statusArtifact.stage !== 'complete' ||
    statusArtifact.artifactVersion !== input.artifactVersion ||
    !isCompatibleWorkSelectionMode(
      input.workSelectionMode ?? 'all-doc',
      statusArtifact.workSelectionMode
    )
  ) {
    return null
  }

  if (
    resultArtifact == null ||
    resultArtifact.artifactVersion !== input.artifactVersion ||
    resultArtifact.formSnapshotHash !== input.formSnapshotHash ||
    !isCompatibleWorkSelectionMode(
      input.workSelectionMode ?? 'all-doc',
      resultArtifact.workSelectionMode
    )
  ) {
    return null
  }

  return resultArtifact
}

function isCompatibleWorkSelectionMode(
  requestedMode: Extract<ValidationWorkSelectionMode, 'all-doc' | 'gated-first-pass'>,
  cachedMode?: ValidationWorkSelectionMode
): boolean {
  const normalizedCachedMode = cachedMode ?? 'all-doc'

  if (requestedMode === 'all-doc') {
    return normalizedCachedMode === 'all-doc'
  }

  return (
    normalizedCachedMode === 'gated-first-pass' ||
    normalizedCachedMode === 'gated-fallback'
  )
}

async function readOptionalArtifact<T>(
  s3Client: ArtifactS3Client,
  bucket: string,
  key: string
): Promise<T | null> {
  try {
    return await s3Client.getJson<T>(bucket, key)
  } catch (error) {
    if (error instanceof Error && error.message.includes('S3 object not found')) {
      return null
    }

    throw error
  }
}
