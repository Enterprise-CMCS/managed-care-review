import type { DateValidationResult } from '../prompts'
import type { PdfOcrDisposition } from '../parsing'
import type { ValidationResponseIssue } from '../validation-output'

export type ValidationPhase =
  | 'fetch'
  | 'parse'
  | 'ocr'
  | 'chunk'
  | 'embed'
  | 'retrieval'
  | 'validation'

export type ValidationPhaseTimingSummary = Record<ValidationPhase, number>
export interface ValidationLifecycleTimingSummary {
  triggerAcceptedAt: string
  firstStatusWriteAt: string
  firstIndexedArtifactAt?: string
  completedAt: string
}

export interface ValidationRerankingDiagnostics {
  candidateCount: number
  sampledDocumentCount: number
  cachedSampleCount: number
  freshSampleCount: number
  sampleUnavailableCount: number
  llmRequestCount: number
  sampleFetchElapsedMs: number
  // This is the aggregate request time across reranking calls, not a wall-clock
  // span, so concurrent runs can make it larger than totalElapsedMs.
  llmElapsedMs: number
  totalElapsedMs: number
}

export type ValidationWorkSelectionMode =
  | 'all-doc'
  | 'gated-first-pass'
  | 'gated-fallback'

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

export interface ValidationDocumentWorkSelectionDiagnostic {
  priorityScore: number
  priorityReasons: string[]
  bucket: 'first-pass' | 'deferred'
  heuristicGroupKey?: string
  heuristicGroupKeySource?: 'filename-prefix'
}

export interface ValidationDocumentDiagnostic {
  documentName: string
  // Trigger-time unsupported-file skips do not have worker-fetch metadata, so
  // source location stays optional even though worker-reviewed PDFs persist it.
  sourceBucket?: string
  sourceKey?: string
  sourceSha256?: string
  status: 'skipped' | 'failed' | 'processed'
  usable: boolean
  chunkCount: number
  ocrDisposition?: PdfOcrDisposition
  workSelection?: ValidationDocumentWorkSelectionDiagnostic
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
    ...(documentDiagnostics.length > 0 ? { documentDiagnostics } : {}),
    ...(llmDiagnostics.length > 0 ? { llmDiagnostics } : {}),
    ...(retrievalDiagnostics.length > 0 ? { retrievalDiagnostics } : {}),
    ...(phaseTimingsMs ? { phaseTimingsMs } : {}),
    ...(lifecycleTiming ? { lifecycleTiming } : {}),
    ...(rerankingDiagnostics ? { rerankingDiagnostics } : {}),
    ...(workSelectionMode !== 'all-doc' ? { workSelectionMode } : {}),
    ...(fieldWorkSelectionDiagnostics.length > 0
      ? { fieldWorkSelectionDiagnostics }
      : {})
  }
}
