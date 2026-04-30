import {
  buildOptionalArtifactField,
  buildSharedValidationArtifactFields,
  type ValidationDocumentDiagnostic,
  type ValidationLifecycleTimingArtifact,
  type ValidationRerankingDiagnostics,
  type ValidationWorkSelectionMode
} from '../artifacts/validationArtifactContract'

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
  // Status artifacts may carry the same diagnostics as the final result so
  // polling and failed runs can still explain coverage before completion.
  documentDiagnostics?: ValidationDocumentDiagnostic[]
  indexingProgress?: ValidationIndexingProgressArtifact
  workSelectionMode?: ValidationWorkSelectionMode
  lifecycleTiming?: ValidationLifecycleTimingArtifact
  rerankingDiagnostics?: ValidationRerankingDiagnostics
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
  indexingProgress?: ValidationIndexingProgressArtifact,
  lifecycleTiming?: ValidationLifecycleTimingArtifact,
  rerankingDiagnostics?: ValidationRerankingDiagnostics
): ValidationStatusArtifact {
  return {
    stage,
    // Carry artifactVersion on the status file so later polling or storage
    // code can detect stale pipeline state after document changes.
    artifactVersion,
    updatedAt: new Date().toISOString(),
    error,
    ...buildSharedValidationArtifactFields({
      documentDiagnostics,
      workSelectionMode,
      lifecycleTiming,
      rerankingDiagnostics
    }),
    ...buildOptionalArtifactField('indexingProgress', indexingProgress)
  }
}

export function buildFailedValidationStatusArtifact(
  artifactVersion: string,
  error: string,
  documentDiagnostics: ValidationDocumentDiagnostic[] = [],
  workSelectionMode: ValidationWorkSelectionMode = 'all-doc',
  lifecycleTiming?: ValidationLifecycleTimingArtifact,
  rerankingDiagnostics?: ValidationRerankingDiagnostics
): ValidationStatusArtifact {
  return buildValidationStatusArtifact(
    'failed',
    artifactVersion,
    error,
    documentDiagnostics,
    workSelectionMode,
    undefined,
    lifecycleTiming,
    rerankingDiagnostics
  )
}

export function buildCompletedValidationStatusArtifact(
  artifactVersion: string,
  documentDiagnostics: ValidationDocumentDiagnostic[] = [],
  workSelectionMode: ValidationWorkSelectionMode = 'all-doc',
  lifecycleTiming?: ValidationLifecycleTimingArtifact,
  rerankingDiagnostics?: ValidationRerankingDiagnostics
): ValidationStatusArtifact {
  return buildValidationStatusArtifact(
    'complete',
    artifactVersion,
    null,
    documentDiagnostics,
    workSelectionMode,
    undefined,
    lifecycleTiming,
    rerankingDiagnostics
  )
}
