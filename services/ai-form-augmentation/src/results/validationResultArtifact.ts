import type { DateValidationResult } from '../prompts'
import type { ValidationResponseIssue } from '../validation-output'
import {
  buildOptionalArtifactArrayField,
  buildOptionalArtifactField,
  buildSharedValidationArtifactFields,
  type ValidationDocumentDiagnostic,
  type ValidationLifecycleTimingSummary,
  type ValidationPhase,
  type ValidationPhaseTimingSummary,
  type ValidationRerankingDiagnostics,
  type ValidationWorkSelectionMode
} from '../artifacts/validationArtifactContract'

export interface ValidationResultArtifact {
  artifactVersion: string
  formSnapshotHash: string
  results: DateValidationResult[]
  // Result artifacts are the canonical completed record. When both result and
  // status artifacts exist, consumers should prefer these diagnostics because
  // they reflect the final stored outcome rather than an in-progress snapshot.
  documentDiagnostics?: ValidationDocumentDiagnostic[]
  // Keep LLM-path diagnostics off the user-facing result contract while still
  // making malformed or incomplete model output measurable in evaluation runs.
  llmDiagnostics?: ValidationLlmDiagnostic[]
  // Retrieval diagnostics stay optional for the same reason: evaluation needs
  // them, but the product flow should not depend on this PoC-only detail.
  retrievalDiagnostics?: ValidationRetrievalDiagnostic[]
  phaseTimingsMs?: ValidationPhaseTimingSummary
  lifecycleTiming?: ValidationLifecycleTimingSummary
  rerankingDiagnostics?: ValidationRerankingDiagnostics
  workSelectionMode?: ValidationWorkSelectionMode
  fieldWorkSelectionDiagnostics?: ValidationFieldWorkSelectionDiagnostic[]
}

export interface ValidationLlmDiagnostic {
  field: string
  issue:
    | ValidationResponseIssue
    | 'missing-field-result'
    | 'multiple-field-results'
  message: string
}

export interface ValidationRetrievalDiagnostic {
  field: string
  candidateChunkCount: number
  initialChunkCount: number
  finalChunkCount: number
  representedDocumentCount: number
  droppedCandidateCount: number
  competingDateCount: number
  clauseEvidencePresentInitially: boolean
  clauseEvidencePresentFinally: boolean
  clauseEvidenceAdded: boolean
}

export interface ValidationFieldWorkSelectionDiagnostic {
  field: string
  // This is product-relevant because the Review page explains whether a field
  // was resolved from the initial pass, fallback, or only partial coverage.
  evidenceSource: 'all-doc' | 'first-pass' | 'fallback' | 'partial'
  fallbackReasons?: string[]
}

export function getValidationResultKey(formId: string): string {
  return `rag-indexes/${formId}/validation-result.json`
}

export function buildValidationResultArtifact (
  artifactVersion: string,
  formSnapshotHash: string,
  results: DateValidationResult[],
  llmDiagnostics: ValidationLlmDiagnostic[] = [],
  retrievalDiagnostics: ValidationRetrievalDiagnostic[] = [],
  documentDiagnostics: ValidationDocumentDiagnostic[] = [],
  workSelectionMode: ValidationWorkSelectionMode = 'all-doc',
  fieldWorkSelectionDiagnostics: ValidationFieldWorkSelectionDiagnostic[] = [],
  phaseTimingsMs?: ValidationPhaseTimingSummary,
  lifecycleTiming?: ValidationLifecycleTimingSummary,
  rerankingDiagnostics?: ValidationRerankingDiagnostics
): ValidationResultArtifact {
  return {
    artifactVersion,
    // Keep formSnapshotHash on the stored result so later cache logic can tell
    // the difference between a document change and a form-data-only change.
    formSnapshotHash,
    results,
    ...buildSharedValidationArtifactFields({
      documentDiagnostics,
      workSelectionMode,
      lifecycleTiming,
      rerankingDiagnostics
    }),
    ...buildOptionalArtifactArrayField('llmDiagnostics', llmDiagnostics),
    ...buildOptionalArtifactArrayField(
      'retrievalDiagnostics',
      retrievalDiagnostics
    ),
    ...buildOptionalArtifactField('phaseTimingsMs', phaseTimingsMs),
    ...buildOptionalArtifactArrayField(
      'fieldWorkSelectionDiagnostics',
      fieldWorkSelectionDiagnostics
    )
  }
}
