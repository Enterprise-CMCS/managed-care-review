import type { DateValidationResult } from '../prompts'

export interface ValidationResultArtifact {
  artifactVersion: string
  formSnapshotHash: string
  results: DateValidationResult[]
}

export function getValidationResultKey(formId: string): string {
  return `rag-indexes/${formId}/validation-result.json`
}

export function buildValidationResultArtifact (
  artifactVersion: string,
  formSnapshotHash: string,
  results: DateValidationResult[]
): ValidationResultArtifact {
  return {
    artifactVersion,
    // Keep formSnapshotHash on the stored result so later cache logic can tell
    // the difference between a document change and a form-data-only change.
    formSnapshotHash,
    results
  }
}
