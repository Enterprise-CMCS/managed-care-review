import type {
  ValidationDocumentDiagnostic,
  ValidationWorkSelectionMode
} from '../results'

export type ValidationPipelineStage =
  | 'parsing'
  | 'retrieving'
  | 'deterministic-validation'
  | 'llm-validation'
  | 'complete'
  | 'failed'

export interface ValidationIndexingProgressArtifact {
  completedDocuments: number
  totalDocuments: number
}

export interface ValidationStatusArtifact {
  stage: ValidationPipelineStage
  artifactVersion: string
  updatedAt: string
  error: string | null
  documentDiagnostics?: ValidationDocumentDiagnostic[]
  indexingProgress?: ValidationIndexingProgressArtifact
  workSelectionMode?: ValidationWorkSelectionMode
}

export function getValidationStatusKey(formId: string): string {
  return `rag-indexes/${formId}/status.json`
}

export function buildValidationStatusArtifact(
  stage: ValidationPipelineStage,
  artifactVersion: string,
  error: string | null = null,
  documentDiagnostics: ValidationDocumentDiagnostic[] = [],
  workSelectionMode: ValidationWorkSelectionMode = 'all-doc',
  indexingProgress?: ValidationIndexingProgressArtifact
): ValidationStatusArtifact {
  return {
    stage,
    // Carry artifactVersion on the status file so later polling or storage
    // code can detect stale pipeline state after document changes.
    artifactVersion,
    updatedAt: new Date().toISOString(),
    error,
    ...(documentDiagnostics.length > 0 ? { documentDiagnostics } : {}),
    ...(indexingProgress ? { indexingProgress } : {}),
    ...(workSelectionMode !== 'all-doc' ? { workSelectionMode } : {})
  }
}

export function buildFailedValidationStatusArtifact(
  artifactVersion: string,
  error: string,
  documentDiagnostics: ValidationDocumentDiagnostic[] = [],
  workSelectionMode: ValidationWorkSelectionMode = 'all-doc'
): ValidationStatusArtifact {
  return buildValidationStatusArtifact(
    'failed',
    artifactVersion,
    error,
    documentDiagnostics,
    workSelectionMode
  )
}

export function buildCompletedValidationStatusArtifact(
  artifactVersion: string,
  documentDiagnostics: ValidationDocumentDiagnostic[] = [],
  workSelectionMode: ValidationWorkSelectionMode = 'all-doc'
): ValidationStatusArtifact {
  return buildValidationStatusArtifact(
    'complete',
    artifactVersion,
    null,
    documentDiagnostics,
    workSelectionMode
  )
}
