export type ValidationPipelineStage =
  | 'parsing'
  | 'embedding'
  | 'indexing'
  | 'validating'
  | 'complete'
  | 'failed'

export interface ValidationStatusArtifact {
  stage: ValidationPipelineStage
  artifactVersion: string
  updatedAt: string
  error: string | null
}

export function getValidationStatusKey(formId: string): string {
  return `rag-indexes/${formId}/status.json`
}

export function buildValidationStatusArtifact(
  stage: ValidationPipelineStage,
  artifactVersion: string,
  error: string | null = null
): ValidationStatusArtifact {
  return {
    stage,
    // Carry artifactVersion on the status file so later polling or storage
    // code can detect stale pipeline state after document changes.
    artifactVersion,
    updatedAt: new Date().toISOString(),
    error
  }
}

export function buildFailedValidationStatusArtifact(
  artifactVersion: string,
  error: string
): ValidationStatusArtifact {
  return buildValidationStatusArtifact('failed', artifactVersion, error)
}

export function buildCompletedValidationStatusArtifact(
  artifactVersion: string
): ValidationStatusArtifact {
  return buildValidationStatusArtifact('complete', artifactVersion)
}
