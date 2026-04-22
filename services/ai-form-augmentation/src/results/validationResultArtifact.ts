import type { DateValidationResult } from '../prompts'
import type { PdfOcrDisposition } from '../parsing'
import type { ValidationResponseIssue } from '../validation-output'

export interface ValidationResultArtifact {
  artifactVersion: string
  formSnapshotHash: string
  results: DateValidationResult[]
  documentDiagnostics?: ValidationDocumentDiagnostic[]
  // Keep LLM-path diagnostics off the user-facing result contract while still
  // making malformed or incomplete model output measurable in evaluation runs.
  llmDiagnostics?: ValidationLlmDiagnostic[]
  // Retrieval diagnostics stay optional for the same reason: evaluation needs
  // them, but the product flow should not depend on this PoC-only detail.
  retrievalDiagnostics?: ValidationRetrievalDiagnostic[]
}

export interface ValidationDocumentDiagnostic {
  documentName: string
  sourceBucket?: string
  sourceKey?: string
  status: 'skipped' | 'failed' | 'processed'
  usable: boolean
  chunkCount: number
  ocrDisposition?: PdfOcrDisposition
  reason?: string
  error?: string
  stage?: 'cache' | 'fetch' | 'parse' | 'chunk' | 'embed'
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

export function getValidationResultKey(formId: string): string {
  return `rag-indexes/${formId}/validation-result.json`
}

export function buildValidationResultArtifact (
  artifactVersion: string,
  formSnapshotHash: string,
  results: DateValidationResult[],
  llmDiagnostics: ValidationLlmDiagnostic[] = [],
  retrievalDiagnostics: ValidationRetrievalDiagnostic[] = [],
  documentDiagnostics: ValidationDocumentDiagnostic[] = []
): ValidationResultArtifact {
  return {
    artifactVersion,
    // Keep formSnapshotHash on the stored result so later cache logic can tell
    // the difference between a document change and a form-data-only change.
    formSnapshotHash,
    results,
    ...(documentDiagnostics.length > 0 ? { documentDiagnostics } : {}),
    ...(llmDiagnostics.length > 0 ? { llmDiagnostics } : {}),
    ...(retrievalDiagnostics.length > 0 ? { retrievalDiagnostics } : {})
  }
}
