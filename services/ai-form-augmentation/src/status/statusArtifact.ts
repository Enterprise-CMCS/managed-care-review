import type { ValidationDocumentDiagnostic } from '../results'

export type ValidationPipelineStage =
  | 'parsing'
  | 'retrieving'
  | 'deterministic-validation'
  | 'llm-validation'
  | 'complete'
  | 'failed'

export interface ValidationStatusArtifact {
  stage: ValidationPipelineStage
  artifactVersion: string
  updatedAt: string
  error: string | null
  documentDiagnostics?: ValidationDocumentDiagnostic[]
}

export function getValidationStatusKey(formId: string): string {
  return `rag-indexes/${formId}/status.json`
}

export function buildValidationStatusArtifact(
  stage: ValidationPipelineStage,
  artifactVersion: string,
  error: string | null = null,
  documentDiagnostics: ValidationDocumentDiagnostic[] = []
): ValidationStatusArtifact {
  return {
    stage,
    // Carry artifactVersion on the status file so later polling or storage
    // code can detect stale pipeline state after document changes.
    artifactVersion,
    updatedAt: new Date().toISOString(),
    error,
    ...(documentDiagnostics.length > 0 ? { documentDiagnostics } : {})
  }
}

export function buildFailedValidationStatusArtifact(
  artifactVersion: string,
  error: string,
  documentDiagnostics: ValidationDocumentDiagnostic[] = []
): ValidationStatusArtifact {
  return buildValidationStatusArtifact(
    'failed',
    artifactVersion,
    error,
    documentDiagnostics
  )
}

export function buildCompletedValidationStatusArtifact(
  artifactVersion: string,
  documentDiagnostics: ValidationDocumentDiagnostic[] = []
): ValidationStatusArtifact {
  return buildValidationStatusArtifact(
    'complete',
    artifactVersion,
    null,
    documentDiagnostics
  )
}
