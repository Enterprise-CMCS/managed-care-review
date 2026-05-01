import type { PdfOcrDisposition } from '../parsing'

export type ValidationPhase =
  | 'fetch'
  | 'parse'
  | 'ocr'
  | 'chunk'
  | 'embed'
  | 'retrieval'
  | 'validation'

export type ValidationPhaseTimingSummary = Record<ValidationPhase, number>

interface ValidationLifecycleTimingBase {
  triggerAcceptedAt: string
  firstStatusWriteAt: string
  firstIndexedArtifactAt?: string
}

export interface ValidationLifecycleTimingArtifact
  extends ValidationLifecycleTimingBase {
  completedAt?: string
}

export interface ValidationLifecycleTimingSummary
  extends ValidationLifecycleTimingBase {
  completedAt: string
}

export interface ValidationRerankingDiagnostics {
  candidateCount: number
  sampledDocumentCount: number
  cachedSampleCount: number
  freshSampleCount: number
  sampleUnavailableCount: number
  llmRequestCount: number
  timedOutCount: number
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

type ValidationArtifactSharedFields<
  LifecycleTiming extends ValidationLifecycleTimingArtifact
> = {
  documentDiagnostics?: ValidationDocumentDiagnostic[]
  workSelectionMode?: ValidationWorkSelectionMode
  lifecycleTiming?: LifecycleTiming
  rerankingDiagnostics?: ValidationRerankingDiagnostics
}

function includeOptionalArrayProperty<Key extends string, Value>(
  key: Key,
  values: Value[]
): Partial<Record<Key, Value[]>> {
  return values.length > 0 ? ({ [key]: values } as Record<Key, Value[]>) : {}
}

function includeOptionalProperty<Key extends string, Value>(
  key: Key,
  value: Value | undefined
): Partial<Record<Key, Value>> {
  return value ? ({ [key]: value } as Record<Key, Value>) : {}
}

export function buildSharedValidationArtifactFields<
  LifecycleTiming extends ValidationLifecycleTimingArtifact
>(args: {
  documentDiagnostics?: ValidationDocumentDiagnostic[]
  workSelectionMode?: ValidationWorkSelectionMode
  lifecycleTiming?: LifecycleTiming
  rerankingDiagnostics?: ValidationRerankingDiagnostics
}): ValidationArtifactSharedFields<LifecycleTiming> {
  return {
    ...includeOptionalArrayProperty(
      'documentDiagnostics',
      args.documentDiagnostics ?? []
    ),
    ...(args.workSelectionMode && args.workSelectionMode !== 'all-doc'
      ? { workSelectionMode: args.workSelectionMode }
      : {}),
    ...includeOptionalProperty('lifecycleTiming', args.lifecycleTiming),
    ...includeOptionalProperty(
      'rerankingDiagnostics',
      args.rerankingDiagnostics
    )
  }
}

export function buildOptionalArtifactArrayField<Key extends string, Value>(
  key: Key,
  values: Value[]
): Partial<Record<Key, Value[]>> {
  return includeOptionalArrayProperty(key, values)
}

export function buildOptionalArtifactField<Key extends string, Value>(
  key: Key,
  value: Value | undefined
): Partial<Record<Key, Value>> {
  return includeOptionalProperty(key, value)
}
