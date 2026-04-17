import type { DateValidationResult } from '../prompts'
import type { ValidationResponseIssue } from '../validation-output'

export interface ValidationResultArtifact {
  artifactVersion: string
  formSnapshotHash: string
  results: DateValidationResult[]
  // Keep LLM-path diagnostics off the user-facing result contract while still
  // making malformed or incomplete model output measurable in evaluation runs.
  llmDiagnostics?: ValidationLlmDiagnostic[]
}

export interface ValidationLlmDiagnostic {
  field: string
  issue:
    | ValidationResponseIssue
    | 'missing-field-result'
    | 'multiple-field-results'
  message: string
}

export function getValidationResultKey(formId: string): string {
  return `rag-indexes/${formId}/validation-result.json`
}

export function buildValidationResultArtifact (
  artifactVersion: string,
  formSnapshotHash: string,
  results: DateValidationResult[],
  llmDiagnostics: ValidationLlmDiagnostic[] = []
): ValidationResultArtifact {
  return {
    artifactVersion,
    // Keep formSnapshotHash on the stored result so later cache logic can tell
    // the difference between a document change and a form-data-only change.
    formSnapshotHash,
    results,
    ...(llmDiagnostics.length > 0 ? { llmDiagnostics } : {})
  }
}
