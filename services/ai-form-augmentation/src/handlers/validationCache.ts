import type { ValidationResultArtifact } from '../results'
import { getValidationResultKey } from '../results'
import { ArtifactNotFoundError, type ArtifactS3Client } from '../s3'
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
    !hasCompatibleReusableStatusArtifact(
      statusArtifact,
      input.artifactVersion,
      input.workSelectionMode
    )
  ) {
    return null
  }

  if (
    resultArtifact == null ||
    resultArtifact.artifactVersion !== input.artifactVersion ||
    resultArtifact.formSnapshotHash !== input.formSnapshotHash ||
    !isCompatibleReusableWorkSelectionMode(
      input.workSelectionMode ?? 'all-doc',
      resultArtifact.workSelectionMode
    )
  ) {
    return null
  }

  return resultArtifact
}

export function isCompatibleReusableWorkSelectionMode(
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

function hasCompatibleReusableStatusArtifact(
  statusArtifact: ValidationStatusArtifact | null,
  artifactVersion: string,
  workSelectionMode?: Extract<
    ValidationWorkSelectionMode,
    'all-doc' | 'gated-first-pass'
  >
): boolean {
  return (
    statusArtifact != null &&
    statusArtifact.stage === 'complete' &&
    statusArtifact.artifactVersion === artifactVersion &&
    isCompatibleReusableWorkSelectionMode(
      workSelectionMode ?? 'all-doc',
      statusArtifact.workSelectionMode
    )
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
    if (error instanceof ArtifactNotFoundError) {
      return null
    }

    throw error
  }
}
