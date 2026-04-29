import type {
  ValidationDocumentDiagnostic,
  ValidationRerankingDiagnostics,
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

export interface ValidationLifecycleTimingArtifact {
  triggerAcceptedAt: string
  firstStatusWriteAt: string
  firstIndexedArtifactAt?: string
  completedAt?: string
}

export interface ValidationStatusArtifact {
  stage: ValidationPipelineStage
  artifactVersion: string
  updatedAt: string
  error: string | null
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
    ...(documentDiagnostics.length > 0 ? { documentDiagnostics } : {}),
    ...(indexingProgress ? { indexingProgress } : {}),
    ...(workSelectionMode !== 'all-doc' ? { workSelectionMode } : {}),
    ...(lifecycleTiming ? { lifecycleTiming } : {}),
    ...(rerankingDiagnostics ? { rerankingDiagnostics } : {})
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
