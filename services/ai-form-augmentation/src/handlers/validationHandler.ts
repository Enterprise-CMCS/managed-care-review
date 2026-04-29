import {
  buildChunksArtifact,
  buildIndexedDocumentArtifact,
  buildParsedDocumentArtifact,
  classifyDocumentSetChanges,
  computeDocumentCacheKey,
  getChunksArtifactKey,
  getDocumentIndexArtifactKey,
  getParsedDocumentArtifactKey,
  type ChunksArtifact,
  type IndexedDocumentSummary,
  type IndexedDocumentArtifact,
  type ParsedDocumentArtifact
} from '../artifacts'
import { chunkDocument } from '../chunking'
import { XenovaEmbeddingProvider } from '../embeddings'
import {
  isCompatibleReusableWorkSelectionMode,
  readReusableValidationResult
} from './validationCache'
import { newValidationLlmClient } from '../llm'
import type { ValidationLlmConfig } from '../llm'
import { extractPdfTextSample, parsePdf } from '../parsing'
import type { PdfOcrDisposition } from '../parsing'
import type { DateValidationFieldInput, DateValidationResult } from '../prompts'
import { buildDateValidationPrompt } from '../prompts'
import {
  buildFieldRetrievalQuery,
  expandClauseEvidenceForField,
  orderRetrievedChunks,
  selectDiverseRetrievedChunks
} from '../retrieval'
import {
  buildValidationResultArtifact,
  getValidationResultKey,
  type ValidationDocumentDiagnostic,
  type ValidationDocumentWorkSelectionDiagnostic,
  type ValidationFieldWorkSelectionDiagnostic,
  type ValidationLifecycleTimingSummary,
  type ValidationPhase,
  type ValidationPhaseTimingSummary,
  type ValidationRerankingDiagnostics,
  type ValidationRetrievalDiagnostic,
  type ValidationResultArtifact,
  type ValidationWorkSelectionMode
} from '../results'
import { newArtifactS3Client } from '../s3'
import type { ArtifactS3Client, ArtifactS3ClientConfig } from '../s3'
import {
  buildCompletedValidationStatusArtifact,
  buildFailedValidationStatusArtifact,
  buildValidationStatusArtifact,
  getValidationStatusKey,
  type ValidationLifecycleTimingArtifact,
  type ValidationStatusArtifact
} from '../status'
import {
  normalizeLlmValidationResult,
  parseValidationResponse,
  resolveDisplayedDocumentDateFromCitedChunks,
  resolveSupportedFieldDateFromChunks,
  runDeterministicDateValidation,
  shouldFallbackConflictingClauseResolutionToLlm,
  type ValidationResponseIssue
} from '../validation-output'
import { BruteForceVectorStore } from '../vector-store'
import { computeFormSnapshotHash } from '../versioning'

export interface ValidationSourceDocument {
  documentName: string
  sourceBucket: string
  sourceKey: string
}

export type ValidationPhaseTimingDiagnostic = {
  phase: ValidationPhase
  elapsedMs: number
}

export interface ValidationIndexingSummaryDiagnostic {
  concurrencyLimit: number
  totalElapsedMs: number
  processedDocuments: number
  failedDocuments: number
}

export interface ValidationHandlerEvent {
  formId: string
  artifactVersion: string
  bucket: string
  triggerAcceptedAt?: string
  firstStatusWriteAt?: string
  firstIndexedArtifactAt?: string
  s3Config: ArtifactS3ClientConfig
  validationLlmConfig?: ValidationLlmConfig
  formFields: DateValidationFieldInput[]
  documents: ValidationSourceDocument[]
  workSelectionMode?: 'all-doc' | 'gated-first-pass'
  documentDiagnostics?: ValidationDocumentDiagnostic[]
  diagnostics?: {
    recordPhaseTiming(
      phase: ValidationPhaseTimingDiagnostic['phase'],
      elapsedMs: number
    ): void
    recordIndexingSummary?(
      summary: ValidationIndexingSummaryDiagnostic
    ): void
  }
}

export interface ValidationHandlerResult {
  formId: string
  artifactVersion: string
  status: 'completed'
}

export const DEFAULT_DOCUMENT_INDEXING_CONCURRENCY = 2
export const LARGE_BATCH_OCR_TRIGGER_DOCUMENT_COUNT = 25
export const LARGE_BATCH_OCR_FALLBACK_LIMIT = 3
// Keep the diagnostic first-pass set intentionally small enough to stress
// whether cheap document ranking would surface useful evidence early.
export const DIAGNOSTIC_FIRST_PASS_DOCUMENT_LIMIT = 12
// Keep the first-pass batch small enough that cached early evidence can stop
// the run before newly admitted mid-ranked peers incur fresh OCR/embed work.
const FIRST_PASS_INDEXING_BATCH_SIZE = 6
// Pull a broader pool than the final prompt can hold so large submissions have
// a chance to surface evidence from more than one noisy top-ranked document.
export const FIELD_RETRIEVAL_CANDIDATE_COUNT = 8
// Keep the final pre-expansion evidence set small enough for the existing
// prompt shape while still allowing a couple of documents to contribute.
export const FIELD_RETRIEVAL_FINAL_CHUNK_LIMIT = 4
// Allow at most two chunks per document so one contract cannot crowd out all
// other candidates, but still preserve some same-document continuity.
export const FIELD_RETRIEVAL_MAX_CHUNKS_PER_DOCUMENT = 2
const INDEXING_PROGRESS_INTERVAL = 5
const FIRST_PASS_RERANKING_CONCURRENCY = 2
const FIRST_PASS_RERANKING_PRIORITY_CANDIDATE_LIMIT =
  DIAGNOSTIC_FIRST_PASS_DOCUMENT_LIMIT
const FIRST_PASS_RERANKING_CANDIDATE_LIMIT = 36
const FIRST_PASS_RERANKING_SAMPLE_PAGE_LIMIT = 2
const FIRST_PASS_RERANKING_SAMPLE_CHAR_LIMIT = 2000
const LARGE_DOCUMENT_PAGE_THRESHOLD = 200
const LARGE_DOCUMENT_SIZE_BYTES_THRESHOLD = 1_000_000
const LOW_YIELD_LLM_PRIORITY_PENALTY = 18
const LARGE_DOCUMENT_NON_HIGH_PRIORITY_PENALTY = 14
const HIGH_YIELD_LLM_PRIORITY_BOOST = 10
const FIRST_PASS_DIVERSITY_SCORE_BAND = 4

function buildValidationLifecycleTiming(args: {
  triggerAcceptedAt?: string
  firstStatusWriteAt?: string
  firstIndexedArtifactAt?: string
  completedAt?: string
}): ValidationLifecycleTimingArtifact & Partial<ValidationLifecycleTimingSummary> {
  return {
    triggerAcceptedAt: args.triggerAcceptedAt ?? new Date().toISOString(),
    firstStatusWriteAt: args.firstStatusWriteAt ?? new Date().toISOString(),
    ...(args.firstIndexedArtifactAt
      ? { firstIndexedArtifactAt: args.firstIndexedArtifactAt }
      : {}),
    ...(args.completedAt ? { completedAt: args.completedAt } : {})
  }
}

export function buildReusableDocumentCacheKeys(args: {
  previousDocuments: IndexedDocumentSummary[]
  currentDocuments: ValidationSourceDocument[]
  allowAllCurrentDocumentsReuse: boolean
}): Set<string> {
  const documentChanges = classifyDocumentSetChanges(
    args.previousDocuments,
    args.currentDocuments
  )
  const reusableCacheKeys = new Set(
    documentChanges.unchanged.map((document) => document.cacheKey)
  )

  if (args.allowAllCurrentDocumentsReuse) {
    for (const document of args.currentDocuments) {
      reusableCacheKeys.add(computeDocumentCacheKey(document))
    }
  }

  return reusableCacheKeys
}

export function buildReusableOcrCappedDocumentCacheKeys(args: {
  previousDocumentDiagnostics: ValidationDocumentDiagnostic[]
  currentDocuments: ValidationSourceDocument[]
  allowReuse: boolean
}): Set<string> {
  if (!args.allowReuse) {
    return new Set()
  }

  const currentDocumentCacheKeys = new Set(
    args.currentDocuments.map((document) => computeDocumentCacheKey(document))
  )

  return new Set(
    args.previousDocumentDiagnostics.flatMap((diagnostic) => {
      if (
        diagnostic.reason !== 'ocr-capped-large-batch' ||
        diagnostic.sourceBucket == null ||
        diagnostic.sourceKey == null
      ) {
        return []
      }

      const cacheKey = computeDocumentCacheKey({
        documentName: diagnostic.documentName,
        sourceBucket: diagnostic.sourceBucket,
        sourceKey: diagnostic.sourceKey
      })

      return currentDocumentCacheKeys.has(cacheKey) ? [cacheKey] : []
    })
  )
}

export function hasReusableDocumentArtifactInputs(args: {
  artifactVersion: string
  workSelectionMode: Extract<
    ValidationWorkSelectionMode,
    'all-doc' | 'gated-first-pass'
  >
  statusArtifact: ValidationStatusArtifact | null
  resultArtifact: ValidationResultArtifact | null
}): boolean {
  const hasReusableStatusArtifact =
    args.statusArtifact != null &&
    args.statusArtifact.stage === 'complete' &&
    args.statusArtifact.artifactVersion === args.artifactVersion &&
    isCompatibleReusableWorkSelectionMode(
      args.workSelectionMode,
      args.statusArtifact.workSelectionMode
    )

  if (hasReusableStatusArtifact) {
    return true
  }

  return (
    args.resultArtifact != null &&
    args.resultArtifact.artifactVersion === args.artifactVersion &&
    isCompatibleReusableWorkSelectionMode(
      args.workSelectionMode,
      args.resultArtifact.workSelectionMode
    )
  )
}

export function selectReusableDocumentDiagnostics(args: {
  artifactVersion: string
  workSelectionMode: Extract<
    ValidationWorkSelectionMode,
    'all-doc' | 'gated-first-pass'
  >
  statusArtifact: ValidationStatusArtifact | null
  resultArtifact: ValidationResultArtifact | null
}): ValidationDocumentDiagnostic[] {
  if (
    args.statusArtifact != null &&
    args.statusArtifact.stage === 'complete' &&
    args.statusArtifact.artifactVersion === args.artifactVersion &&
    isCompatibleReusableWorkSelectionMode(
      args.workSelectionMode,
      args.statusArtifact.workSelectionMode
    )
  ) {
    return args.statusArtifact.documentDiagnostics ?? []
  }

  // status.json is the mutable coordination artifact for an active run, so a
  // fresh trigger may advance it out of `complete` before the worker seeds
  // reuse. Fall back to the last completed result artifact so form-only reruns
  // can still recover terminal document diagnostics for the same artifactVersion.
  if (
    args.resultArtifact != null &&
    args.resultArtifact.artifactVersion === args.artifactVersion &&
    isCompatibleReusableWorkSelectionMode(
      args.workSelectionMode,
      args.resultArtifact.workSelectionMode
    )
  ) {
    return args.resultArtifact.documentDiagnostics ?? []
  }

  return []
}

export async function validationHandler(
  event: ValidationHandlerEvent
): Promise<ValidationHandlerResult> {
  const phaseTimings = buildEmptyValidationPhaseTimingSummary()
  const upstreamDiagnostics = event.diagnostics
  // Always collect worker timings locally so completed result artifacts can
  // persist them, then forward the same measurements to any caller-provided
  // diagnostics sink used by evaluation/reporting code.
  event.diagnostics = {
    recordPhaseTiming: (phase, elapsedMs) => {
      phaseTimings[phase] += elapsedMs
      upstreamDiagnostics?.recordPhaseTiming(phase, elapsedMs)
    },
    recordIndexingSummary: (summary) => {
      upstreamDiagnostics?.recordIndexingSummary?.(summary)
    }
  }
  const s3Client = newArtifactS3Client(event.s3Config)
  const formSnapshotHash = computeFormSnapshotHash(
    event.formFields.map((field) => ({
      field: field.field,
      value: field.value
    }))
  )
  // status.json is the coordination point the frontend polls, so every major
  // worker phase updates the same key rather than scattering progress across
  // multiple artifacts.
  const statusKey = getValidationStatusKey(event.formId)
  const requestedWorkSelectionMode = event.workSelectionMode ?? 'all-doc'
  event.triggerAcceptedAt ??= new Date().toISOString()
  event.firstStatusWriteAt ??= new Date().toISOString()
  const triggerAcceptedAt = event.triggerAcceptedAt
  const firstStatusWriteAt = event.firstStatusWriteAt
  let rerankingDiagnostics: ValidationRerankingDiagnostics | undefined
  let documentDiagnostics: ValidationDocumentDiagnostic[] = [
    ...(event.documentDiagnostics ?? [])
  ]

  try {
    // Keep cache reuse inside the worker so app-api continues to fire the same
    // payload shape while the artifact-driven runtime decides whether the
    // current inputs need fresh validation work.
    const reusableResult = await readReusableValidationResult({
      s3Client,
      bucket: event.bucket,
      formId: event.formId,
      artifactVersion: event.artifactVersion,
      formSnapshotHash,
      workSelectionMode: requestedWorkSelectionMode
    })

    if (reusableResult) {
      return {
        formId: event.formId,
        artifactVersion: event.artifactVersion,
        status: 'completed'
      }
    }

    const previousStatusArtifact =
      await readOptionalArtifact<ValidationStatusArtifact>(
        s3Client,
        event.bucket,
        statusKey
      )
    const previousResultArtifact =
      await readOptionalArtifact<ValidationResultArtifact>(
        s3Client,
        event.bucket,
        getValidationResultKey(event.formId)
      )
    const canReuseCurrentDocumentArtifacts = hasReusableDocumentArtifactInputs({
      artifactVersion: event.artifactVersion,
      workSelectionMode: requestedWorkSelectionMode,
      statusArtifact: previousStatusArtifact,
      resultArtifact: previousResultArtifact
    })

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildValidationStatusArtifact(
        'parsing',
        event.artifactVersion,
        null,
        [],
        requestedWorkSelectionMode,
        undefined,
        buildValidationLifecycleTiming(event)
      )
    )

    const previousChunksArtifact = await readOptionalArtifact<ChunksArtifact>(
      s3Client,
      event.bucket,
      getChunksArtifactKey(event.formId)
    )
    let workSelectionDiagnostics = scoreValidationDocuments(
      event.documents,
      event.formFields
    )
    const unchangedDocumentCacheKeys = buildReusableDocumentCacheKeys({
      previousDocuments: previousChunksArtifact?.documents ?? [],
      currentDocuments: event.documents,
      allowAllCurrentDocumentsReuse: canReuseCurrentDocumentArtifacts
    })
    const reusableOcrCappedDocumentCacheKeys =
      buildReusableOcrCappedDocumentCacheKeys({
        previousDocumentDiagnostics: selectReusableDocumentDiagnostics({
          artifactVersion: event.artifactVersion,
          workSelectionMode: requestedWorkSelectionMode,
          statusArtifact: previousStatusArtifact,
          resultArtifact: previousResultArtifact
        }),
        currentDocuments: event.documents,
        allowReuse: canReuseCurrentDocumentArtifacts
      })
    if (requestedWorkSelectionMode === 'gated-first-pass') {
      const reranking = await rerankValidationDocuments({
        event,
        s3Client,
        unchangedDocumentCacheKeys,
        scoredDocuments: workSelectionDiagnostics
      })
      workSelectionDiagnostics = reranking.scoredDocuments
      rerankingDiagnostics = reranking.diagnostics
    }
    const workSelectionByCacheKey = new Map(
      workSelectionDiagnostics.map((diagnostic) => [
        computeDocumentCacheKey(diagnostic.document),
        diagnostic.workSelection
      ])
    )
    const embeddingProvider = new XenovaEmbeddingProvider()
    const embeddingModel = embeddingProvider.getModelInfo()
    const shouldAttemptOcrFallback = createOcrFallbackPolicy(
      event.documents.length
    )
    const selectedDocuments =
      requestedWorkSelectionMode === 'all-doc'
        ? event.documents
        : selectFirstPassDocuments(workSelectionDiagnostics)
    const baselineDeferredDocuments =
      requestedWorkSelectionMode === 'all-doc'
        ? []
        : event.documents.filter(
            (document) =>
              !selectedDocuments.some(
                (selectedDocument) =>
                  computeDocumentCacheKey(selectedDocument) ===
                  computeDocumentCacheKey(document)
              )
          )

    // Document-level failures stay isolated so one renamed or corrupt PDF does
    // not throw away usable evidence from the rest of the submission.
    const documentIndexingStartedAt = Date.now()
    const firstPassIndexing:
      | {
          indexedDocuments: IndexedDocumentArtifact[]
          documentDiagnostics: ValidationDocumentDiagnostic[]
          deferredDocuments: ValidationSourceDocument[]
        }
      | undefined =
      requestedWorkSelectionMode === 'gated-first-pass'
        ? await indexFirstPassDocumentsUntilSufficient({
            event,
            s3Client,
            statusKey,
            embeddingProvider,
            embeddingModel,
            unchangedDocumentCacheKeys,
            reusableOcrCappedDocumentCacheKeys,
            shouldAttemptOcrFallback,
            selectedDocuments,
            workSelectionByCacheKey
          })
        : undefined
    const allDocumentIndexing =
      firstPassIndexing ??
      {
        ...(await indexValidationDocuments({
            event,
            s3Client,
            statusKey,
            embeddingProvider,
            embeddingModel,
            unchangedDocumentCacheKeys,
            reusableOcrCappedDocumentCacheKeys,
            shouldAttemptOcrFallback,
            documents: selectedDocuments,
            workSelectionByCacheKey,
            completedDocumentOffset: 0,
            totalDocumentsToIndex: selectedDocuments.length,
            workSelectionMode: requestedWorkSelectionMode
          })),
        deferredDocuments: [] as ValidationSourceDocument[]
      }
    let indexedDocuments = allDocumentIndexing.indexedDocuments
    documentDiagnostics = [
      ...documentDiagnostics,
      ...allDocumentIndexing.documentDiagnostics
    ]
    const completedFirstPassDocuments =
      selectedDocuments.length - allDocumentIndexing.deferredDocuments.length
    const deferredDocuments = [
      ...allDocumentIndexing.deferredDocuments,
      ...baselineDeferredDocuments
    ]
    // Keep large-run indexing metrics on the optional diagnostics hook so
    // evaluation can measure queue behavior without widening the persisted
    // product artifact contract in this ticket.
    event.diagnostics?.recordIndexingSummary?.({
      concurrencyLimit: DEFAULT_DOCUMENT_INDEXING_CONCURRENCY,
      totalElapsedMs: Date.now() - documentIndexingStartedAt,
      processedDocuments: indexedDocuments.length,
      failedDocuments:
        documentDiagnostics.filter((diagnostic) => diagnostic.status === 'failed')
          .length
    })

    if (indexedDocuments.length === 0) {
      throw new Error(
        `Validation could not index any usable documents for form ${event.formId}`
      )
    }

    let validationPass = await executeValidationPass({
      event,
      s3Client,
      statusKey,
      embeddingProvider,
      workSelectionMode: requestedWorkSelectionMode,
      indexedDocuments
    })
    let finalWorkSelectionMode:
      | 'all-doc'
      | 'gated-first-pass'
      | 'gated-fallback' = requestedWorkSelectionMode
    let fieldWorkSelectionDiagnostics =
      buildFieldWorkSelectionDiagnostics({
        formFields: event.formFields,
        results: validationPass.reconciledResults,
        retrievalDiagnostics: validationPass.retrievalDiagnostics,
        documentDiagnostics,
        workSelectionMode: requestedWorkSelectionMode,
        deferredDocumentNames: new Set(
          deferredDocuments.map((document) => document.documentName)
        )
      })

    if (
      requestedWorkSelectionMode === 'gated-first-pass' &&
      deferredDocuments.length > 0 &&
      fieldWorkSelectionDiagnostics.some(
        (diagnostic) => diagnostic.evidenceSource !== 'first-pass'
      )
    ) {
      await s3Client.putJson(
        event.bucket,
        statusKey,
        buildValidationStatusArtifact(
          'parsing',
          event.artifactVersion,
          null,
          [],
          'gated-fallback',
          {
            completedDocuments: completedFirstPassDocuments,
            totalDocuments: completedFirstPassDocuments + deferredDocuments.length
          },
          buildValidationLifecycleTiming(event),
          rerankingDiagnostics
        )
      )
      const fallbackIndexing = await indexValidationDocuments({
        event,
        s3Client,
        statusKey,
        embeddingProvider,
        embeddingModel,
        unchangedDocumentCacheKeys,
        reusableOcrCappedDocumentCacheKeys,
        shouldAttemptOcrFallback,
        documents: deferredDocuments,
        workSelectionByCacheKey,
        completedDocumentOffset: completedFirstPassDocuments,
        totalDocumentsToIndex:
          completedFirstPassDocuments + deferredDocuments.length,
        workSelectionMode: 'gated-fallback'
      })
      indexedDocuments = [
        ...indexedDocuments,
        ...fallbackIndexing.indexedDocuments
      ]
      documentDiagnostics = mergeDocumentDiagnostics(
        documentDiagnostics,
        fallbackIndexing.documentDiagnostics
      )
      validationPass = await executeValidationPass({
        event,
        s3Client,
        statusKey,
        embeddingProvider,
        workSelectionMode: 'gated-fallback',
        indexedDocuments
      })
      finalWorkSelectionMode = 'gated-fallback'
      fieldWorkSelectionDiagnostics = buildFieldWorkSelectionDiagnostics({
        formFields: event.formFields,
        results: validationPass.reconciledResults,
        retrievalDiagnostics: validationPass.retrievalDiagnostics,
        documentDiagnostics,
        workSelectionMode: finalWorkSelectionMode,
        deferredDocumentNames: new Set(
          deferredDocuments.map((document) => document.documentName)
        )
      })
    } else if (requestedWorkSelectionMode === 'gated-first-pass') {
      documentDiagnostics = mergeDocumentDiagnostics(
        documentDiagnostics,
        baselineDeferredDocuments.map((document) =>
          buildDeferredDocumentDiagnostic(
            document,
            workSelectionByCacheKey.get(computeDocumentCacheKey(document))
          )
        )
      )
    }

    const resultsWithSupportingCitationData = addSupportingCitationData({
      formFields: event.formFields,
      results: validationPass.reconciledResults,
      retrievedChunksByField: validationPass.retrievedChunksByField,
      retrievalDiagnostics: validationPass.retrievalDiagnostics
    })
    const completedAt = new Date().toISOString()

    logMissingCitationPages(event.formId, resultsWithSupportingCitationData)

    await s3Client.putJson(
      event.bucket,
      getValidationResultKey(event.formId),
      buildValidationResultArtifact(
        event.artifactVersion,
        // Persist the form-value hash alongside the results so later cache logic
        // can distinguish document changes from form-only edits.
        formSnapshotHash,
        resultsWithSupportingCitationData,
        validationPass.llmDiagnostics,
        event.formFields.flatMap((field) => {
          const diagnostic = validationPass.retrievalDiagnostics.get(field.field)

          return diagnostic ? [diagnostic] : []
        }),
        documentDiagnostics,
        finalWorkSelectionMode,
        fieldWorkSelectionDiagnostics,
        phaseTimings,
        {
          triggerAcceptedAt,
          firstStatusWriteAt,
          ...(event.firstIndexedArtifactAt
            ? { firstIndexedArtifactAt: event.firstIndexedArtifactAt }
            : {}),
          completedAt
        },
        rerankingDiagnostics
      )
    )

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildCompletedValidationStatusArtifact(
        event.artifactVersion,
        documentDiagnostics,
        finalWorkSelectionMode,
        buildValidationLifecycleTiming({
          ...event,
          completedAt
        }),
        rerankingDiagnostics
      )
    )

    return {
      formId: event.formId,
      artifactVersion: event.artifactVersion,
      status: 'completed'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildFailedValidationStatusArtifact(
        event.artifactVersion,
        message,
        documentDiagnostics,
        requestedWorkSelectionMode,
        buildValidationLifecycleTiming(event),
        rerankingDiagnostics
      )
    )

    throw error
  }
}

export async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  run: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (limit < 1) {
    throw new Error('Concurrency limit must be at least 1')
  }

  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function runNext(): Promise<void> {
    const currentIndex = nextIndex
    nextIndex += 1

    if (currentIndex >= items.length) {
      return
    }

    results[currentIndex] = await run(items[currentIndex], currentIndex)
    await runNext()
  }

  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      () => runNext()
    )
  )

  return results
}

async function indexValidationDocuments(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  statusKey: string
  embeddingProvider: XenovaEmbeddingProvider
  embeddingModel: string
  unchangedDocumentCacheKeys: Set<string>
  reusableOcrCappedDocumentCacheKeys: Set<string>
  shouldAttemptOcrFallback: () => boolean
  documents: ValidationSourceDocument[]
  workSelectionByCacheKey: Map<string, ValidationDocumentWorkSelectionDiagnostic>
  completedDocumentOffset: number
  totalDocumentsToIndex: number
  workSelectionMode: 'all-doc' | 'gated-first-pass' | 'gated-fallback'
}): Promise<{
  indexedDocuments: IndexedDocumentArtifact[]
  documentDiagnostics: ValidationDocumentDiagnostic[]
}> {
  let completedDocuments = args.completedDocumentOffset
  const documentIndexingResults = await mapWithConcurrencyLimit(
    args.documents,
    DEFAULT_DOCUMENT_INDEXING_CONCURRENCY,
    async (document) => {
      const result = await indexValidationDocument({
        event: args.event,
        s3Client: args.s3Client,
        embeddingProvider: args.embeddingProvider,
        embeddingModel: args.embeddingModel,
        unchangedDocumentCacheKeys: args.unchangedDocumentCacheKeys,
        reusableOcrCappedDocumentCacheKeys:
          args.reusableOcrCappedDocumentCacheKeys,
        shouldAttemptOcrFallback: args.shouldAttemptOcrFallback,
        document
      })
      completedDocuments += 1

      if (
        shouldPersistIndexingProgress(
          completedDocuments,
          args.totalDocumentsToIndex
        )
      ) {
        // Progress is scoped to the current indexing pass. A later
        // gated-fallback pass may expand the document set and start reporting
        // against that larger total instead of rewriting prior first-pass
        // progress as if the broader set had always been in scope.
        await args.s3Client.putJson(
          args.event.bucket,
          args.statusKey,
          buildValidationStatusArtifact(
            'parsing',
            args.event.artifactVersion,
            null,
            [],
            args.workSelectionMode,
            {
              completedDocuments,
              totalDocuments: args.totalDocumentsToIndex
            },
            buildValidationLifecycleTiming(args.event)
          )
        )
      }

      return result
    }
  )

  return {
    indexedDocuments: documentIndexingResults.flatMap((result) =>
      result.indexedDocument ? [result.indexedDocument] : []
    ),
    documentDiagnostics: documentIndexingResults.map((result) =>
      attachWorkSelectionDiagnostic(
        result.diagnostic,
        args.workSelectionByCacheKey.get(computeDocumentCacheKey(result.document))
      )
    )
  }
}

async function indexFirstPassDocumentsUntilSufficient(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  statusKey: string
  embeddingProvider: XenovaEmbeddingProvider
  embeddingModel: string
  unchangedDocumentCacheKeys: Set<string>
  reusableOcrCappedDocumentCacheKeys: Set<string>
  shouldAttemptOcrFallback: () => boolean
  selectedDocuments: ValidationSourceDocument[]
  workSelectionByCacheKey: Map<string, ValidationDocumentWorkSelectionDiagnostic>
}): Promise<{
  indexedDocuments: IndexedDocumentArtifact[]
  documentDiagnostics: ValidationDocumentDiagnostic[]
  deferredDocuments: ValidationSourceDocument[]
}> {
  let indexedDocuments: IndexedDocumentArtifact[] = []
  let documentDiagnostics: ValidationDocumentDiagnostic[] = []
  let completedDocumentOffset = 0

  for (
    let batchStart = 0;
    batchStart < args.selectedDocuments.length;
    batchStart += FIRST_PASS_INDEXING_BATCH_SIZE
  ) {
    const batchDocuments = args.selectedDocuments.slice(
      batchStart,
      batchStart + FIRST_PASS_INDEXING_BATCH_SIZE
    )
    const batchIndexing = await indexValidationDocuments({
      event: args.event,
      s3Client: args.s3Client,
      statusKey: args.statusKey,
      embeddingProvider: args.embeddingProvider,
      embeddingModel: args.embeddingModel,
      unchangedDocumentCacheKeys: args.unchangedDocumentCacheKeys,
      reusableOcrCappedDocumentCacheKeys:
        args.reusableOcrCappedDocumentCacheKeys,
      shouldAttemptOcrFallback: args.shouldAttemptOcrFallback,
      documents: batchDocuments,
      workSelectionByCacheKey: args.workSelectionByCacheKey,
      completedDocumentOffset,
      totalDocumentsToIndex: args.selectedDocuments.length,
      workSelectionMode: 'gated-first-pass'
    })
    indexedDocuments = [...indexedDocuments, ...batchIndexing.indexedDocuments]
    documentDiagnostics = [
      ...documentDiagnostics,
      ...batchIndexing.documentDiagnostics
    ]
    completedDocumentOffset += batchDocuments.length

    const remainingDocuments = args.selectedDocuments.slice(completedDocumentOffset)

    // A batch that only produced skipped diagnostics cannot improve first-pass
    // evidence, so probing retrieval/validation there just adds latency.
    if (
      remainingDocuments.length === 0 ||
      indexedDocuments.length === 0 ||
      batchIndexing.indexedDocuments.length === 0
    ) {
      continue
    }

    // Re-run retrieval/validation only after a bounded slice of the ranked
    // first-pass set so we can stop before late expensive PDFs when the same
    // conservative field diagnostics already say first-pass evidence is enough.
    const validationPass = await executeValidationPass({
      event: args.event,
      s3Client: args.s3Client,
      statusKey: args.statusKey,
      embeddingProvider: args.embeddingProvider,
      workSelectionMode: 'gated-first-pass',
      indexedDocuments
    })
    const fieldWorkSelectionDiagnostics = buildFieldWorkSelectionDiagnostics({
      formFields: args.event.formFields,
      results: validationPass.reconciledResults,
      retrievalDiagnostics: validationPass.retrievalDiagnostics,
      documentDiagnostics,
      workSelectionMode: 'gated-first-pass',
      deferredDocumentNames: new Set()
    })

    if (hasSufficientFirstPassEvidence(fieldWorkSelectionDiagnostics)) {
      return {
        indexedDocuments,
        documentDiagnostics: mergeDocumentDiagnostics(
          documentDiagnostics,
          remainingDocuments.map((document) =>
            buildDeferredDocumentDiagnostic(
              document,
              args.workSelectionByCacheKey.get(computeDocumentCacheKey(document)),
              'sufficient-first-pass-evidence'
            )
          )
        ),
        deferredDocuments: remainingDocuments
      }
    }
  }

  return {
    indexedDocuments,
    documentDiagnostics,
    deferredDocuments: []
  }
}

function shouldPersistIndexingProgress(
  completedDocuments: number,
  totalDocuments: number
): boolean {
  // Keep long runs visibly alive without turning status.json into a per-file
  // heartbeat. Early writes help small runs, then the cadence widens.
  return (
    completedDocuments <= 3 ||
    completedDocuments === totalDocuments ||
    completedDocuments % INDEXING_PROGRESS_INTERVAL === 0
  )
}

async function executeValidationPass(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  statusKey: string
  embeddingProvider: XenovaEmbeddingProvider
  workSelectionMode: 'all-doc' | 'gated-first-pass' | 'gated-fallback'
  indexedDocuments: IndexedDocumentArtifact[]
}): Promise<{
  reconciledResults: DateValidationResult[]
  llmDiagnostics: Array<{
    field: string
    issue:
      | ValidationResponseIssue
      | 'missing-field-result'
      | 'multiple-field-results'
    message: string
  }>
  retrievalDiagnostics: Map<
    DateValidationFieldInput['field'],
    ValidationRetrievalDiagnostic
  >
  retrievedChunksByField: Map<
    DateValidationFieldInput['field'],
    Array<{
      chunkId: string
      documentName: string
      page: number | null
      startPage: number | null
      endPage: number | null
      order: number
      text: string
    }>
  >
}> {
  const chunks = args.indexedDocuments.flatMap((document) => document.chunks)
  const chunkVectors = args.indexedDocuments.flatMap(
    (document) => document.chunkVectors
  )

  if (chunks.length === 0) {
    throw new Error(
      `Validation could not create chunks for form ${args.event.formId}`
    )
  }

  await args.s3Client.putJson(
    args.event.bucket,
    getChunksArtifactKey(args.event.formId),
    buildChunksArtifact(
      args.event.artifactVersion,
      chunks,
      args.indexedDocuments.map((document) => document.document)
    )
  )

  await args.s3Client.putJson(
    args.event.bucket,
    args.statusKey,
    buildValidationStatusArtifact(
      'retrieving',
      args.event.artifactVersion,
      null,
      [],
      args.workSelectionMode,
      undefined,
      buildValidationLifecycleTiming(args.event)
    )
  )

  const vectorStore = new BruteForceVectorStore<{
    chunkId: string
    documentName: string
    order: number
    page: number | null
    startPage: number | null
    endPage: number | null
    text: string
  }>()

  const retrievalDiagnostics = new Map<
    DateValidationFieldInput['field'],
    ValidationRetrievalDiagnostic
  >()
  const retrievedChunksByField = await measureValidationPhase(
    args.event,
    'retrieval',
    async () => {
      await vectorStore.add(
        chunks.map((chunk, index) => ({
          id: chunk.chunkId,
          vector: chunkVectors[index],
          metadata: {
            chunkId: chunk.chunkId,
            documentName: chunk.documentName,
            order: chunk.order,
            page: chunk.page,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            text: chunk.text
          }
        }))
      )

      return new Map(
        await Promise.all(
          args.event.formFields.map(async (field) => {
            const queryVector = await args.embeddingProvider.embedText(
              buildFieldRetrievalQuery(field.field)
            )
            const candidateResults = await vectorStore.search(
              queryVector,
              FIELD_RETRIEVAL_CANDIDATE_COUNT
            )
            const initiallyRetrievedChunks = orderRetrievedChunks(
              selectDiverseRetrievedChunks(
                candidateResults,
                FIELD_RETRIEVAL_FINAL_CHUNK_LIMIT,
                FIELD_RETRIEVAL_MAX_CHUNKS_PER_DOCUMENT
              )
            ).map((result) => ({
              chunkId: result.metadata.chunkId,
              documentName: result.metadata.documentName,
              page: result.metadata.page,
              startPage: result.metadata.startPage,
              endPage: result.metadata.endPage,
              order: result.metadata.order,
              text: result.metadata.text
            }))
            const expandedRetrieval = expandClauseEvidenceForField({
              field: field.field,
              candidateChunkCount: candidateResults.length,
              retrievedChunks: initiallyRetrievedChunks,
              allChunks: chunks
            })

            retrievalDiagnostics.set(
              field.field,
              expandedRetrieval.diagnostics
            )

            return [
              field.field,
              expandedRetrieval.chunks.map((result) => ({
                chunkId: result.chunkId,
                documentName: result.documentName,
                page: result.page,
                startPage: result.startPage,
                endPage: result.endPage,
                order: result.order,
                text: result.text
              }))
            ] as const
          })
        )
      )
    }
  )

  await args.s3Client.putJson(
    args.event.bucket,
    args.statusKey,
    buildValidationStatusArtifact(
      'deterministic-validation',
      args.event.artifactVersion,
      null,
      [],
      args.workSelectionMode,
      undefined,
      buildValidationLifecycleTiming(args.event)
    )
  )

  const deterministicResults: DateValidationResult[] = []
  const unresolvedFields: Array<{
    field: DateValidationFieldInput
    retrievedChunks: Array<{
      chunkId: string
      documentName: string
      page: number | null
      startPage: number | null
      endPage: number | null
      order: number
      text: string
    }>
  }> = []

  await measureValidationPhase(args.event, 'validation', async () => {
    for (const field of args.event.formFields) {
      const retrievedChunksForField = retrievedChunksByField.get(field.field) ?? []
      const deterministicValidation = runDeterministicDateValidation({
        formFields: [field],
        retrievedChunks: retrievedChunksForField
      })

      const fallbackToLlmResults =
        deterministicValidation.resolvedResults.filter((result) =>
          shouldFallbackConflictingClauseResolutionToLlm({
            field: field.field,
            deterministicResult: result,
            retrievedChunks: retrievedChunksForField,
            retrievalDiagnostic: retrievalDiagnostics.get(field.field)
          })
        )

      deterministicResults.push(
        ...deterministicValidation.resolvedResults.filter(
          (result) => !fallbackToLlmResults.includes(result)
        )
      )

      if (
        deterministicValidation.unresolvedFields.length > 0 ||
        fallbackToLlmResults.length > 0
      ) {
        unresolvedFields.push({
          field,
          retrievedChunks: retrievedChunksForField
        })
      }
    }
  })

  let reconciledResults = deterministicResults
  const llmDiagnostics: Array<{
    field: string
    issue:
      | ValidationResponseIssue
      | 'missing-field-result'
      | 'multiple-field-results'
    message: string
  }> = []

  if (unresolvedFields.length > 0) {
    await args.s3Client.putJson(
      args.event.bucket,
      args.statusKey,
      buildValidationStatusArtifact(
        'llm-validation',
        args.event.artifactVersion,
        null,
        [],
        args.workSelectionMode,
        undefined,
        buildValidationLifecycleTiming(args.event)
      )
    )

    const validationClient = newValidationLlmClient(args.event.validationLlmConfig)
    const llmResults = await measureValidationPhase(args.event, 'validation', () =>
      Promise.all(
        unresolvedFields.map(async ({ field, retrievedChunks }) => {
          const prompt = buildDateValidationPrompt({
            formFields: [field],
            retrievedChunks
          })

          const validationResponse = await validationClient.generateValidation({
            prompt
          })
          const parsedLlmResponse = parseSingleFieldValidationResponse(
            validationResponse.rawText,
            field.field
          )

          if (parsedLlmResponse.diagnostic != null) {
            llmDiagnostics.push(parsedLlmResponse.diagnostic)
          }

          const normalizedResult = normalizeLlmValidationResult({
            field,
            result: {
              ...parsedLlmResponse.result,
              decisionSource: 'llm'
            },
            retrievedChunks
          })

          return reconcileValidationResults([normalizedResult], retrievedChunks)
        })
      )
    )

    reconciledResults = [...reconciledResults, ...llmResults.flat()]
  }

  reconciledResults = args.event.formFields.flatMap((field) =>
    reconciledResults.filter((result) => result.field === field.field)
  )

  return {
    reconciledResults,
    llmDiagnostics,
    retrievalDiagnostics,
    retrievedChunksByField
  }
}

async function indexValidationDocument(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  embeddingProvider: XenovaEmbeddingProvider
  embeddingModel: string
  unchangedDocumentCacheKeys: Set<string>
  reusableOcrCappedDocumentCacheKeys: Set<string>
  shouldAttemptOcrFallback: () => boolean
  document: ValidationSourceDocument
}): Promise<{
  document: ValidationSourceDocument
  indexedDocument: IndexedDocumentArtifact | null
  diagnostic: ValidationDocumentDiagnostic
}> {
  const { event, s3Client, embeddingProvider, embeddingModel, document } = args
  const documentCacheKey = computeDocumentCacheKey(document)
  const documentArtifactKey = getDocumentIndexArtifactKey(
    event.formId,
    documentCacheKey
  )
  const parsedDocumentArtifactKey = getParsedDocumentArtifactKey(
    event.formId,
    documentCacheKey
  )
  let stage: NonNullable<ValidationDocumentDiagnostic['stage']> = 'cache'
  let ocrDisposition: PdfOcrDisposition = 'not-needed'

  try {
    if (args.reusableOcrCappedDocumentCacheKeys.has(documentCacheKey)) {
      return {
        document,
        indexedDocument: null,
        diagnostic: {
          documentName: document.documentName,
          sourceBucket: document.sourceBucket,
          sourceKey: document.sourceKey,
          status: 'skipped',
          usable: false,
          chunkCount: 0,
          ocrDisposition: 'skipped',
          stage: 'cache',
          reason: 'ocr-capped-large-batch'
        }
      }
    }

    if (args.unchangedDocumentCacheKeys.has(documentCacheKey)) {
      const cachedDocumentArtifact =
        await readOptionalArtifact<IndexedDocumentArtifact>(
          s3Client,
          event.bucket,
          documentArtifactKey
        )

      if (
        cachedDocumentArtifact != null &&
        cachedDocumentArtifact.embeddingModel === embeddingModel
      ) {
        return {
          document,
          indexedDocument: cachedDocumentArtifact,
          diagnostic: buildProcessedDocumentDiagnostic(
            document,
            cachedDocumentArtifact.chunks.length,
            'cache'
          )
        }
      }
    }

    const reusableParsedArtifact =
      args.unchangedDocumentCacheKeys.has(documentCacheKey)
        ? await readOptionalArtifact<ParsedDocumentArtifact>(
            s3Client,
            event.bucket,
            parsedDocumentArtifactKey
          )
        : null
    // Keep parse/OCR reuse narrower than full document-index reuse. Parsed text
    // is safe to rebuild chunks and embeddings from for unchanged documents, but
    // failed or OCR-capped parses never get persisted in the first place.
    const parsed =
      reusableParsedArtifact != null
        ? buildParseResultFromArtifact(reusableParsedArtifact)
        : await (async () => {
            stage = 'fetch'
            const fileBuffer = await measureValidationPhase(event, 'fetch', () =>
              s3Client.getBuffer(document.sourceBucket, document.sourceKey)
            )
            stage = 'parse'
            const nextParsed = await parsePdfWithDiagnostics(
              event,
              fileBuffer,
              document.documentName,
              args.shouldAttemptOcrFallback
            )

            if (nextParsed.ocrDisposition !== 'skipped') {
              await persistParsedDocumentArtifact({
                event,
                s3Client,
                parsedDocumentArtifactKey,
                document,
                parsed: nextParsed
              })
            }

            return nextParsed
          })()
    ocrDisposition = parsed.ocrDisposition

    if (parsed.ocrDisposition === 'skipped') {
      // When weak text would have needed OCR but the large-batch cap says no,
      // drop the document from indexed evidence rather than trusting partial
      // text and risking a false match or mismatch.
      return {
        document,
        indexedDocument: null,
        diagnostic: {
          documentName: document.documentName,
          sourceBucket: document.sourceBucket,
          sourceKey: document.sourceKey,
          status: 'skipped',
          usable: false,
          chunkCount: 0,
          ocrDisposition: 'skipped',
          stage,
          reason: 'ocr-capped-large-batch'
        }
      }
    }

    stage = 'chunk'
    const chunks = measureValidationPhaseSync(event, 'chunk', () =>
      chunkDocument(parsed.fileName, parsed.rawText, {
        pageTexts: parsed.pageTexts
      })
    )

    if (chunks.length === 0) {
      throw new Error(
        `Validation could not create chunks for document ${document.documentName}`
      )
    }

    stage = 'embed'
    const chunkVectors = await measureValidationPhase(event, 'embed', () =>
      embeddingProvider.embedTexts(chunks.map((chunk) => chunk.text))
    )
    const indexedDocumentArtifact = buildIndexedDocumentArtifact({
      documentName: document.documentName,
      sourceBucket: document.sourceBucket,
      sourceKey: document.sourceKey,
      chunks,
      chunkVectors,
      embeddingModel
    })

    await s3Client.putJson(
      event.bucket,
      documentArtifactKey,
      indexedDocumentArtifact
    )
    event.firstIndexedArtifactAt ??= new Date().toISOString()

    return {
      document,
      indexedDocument: indexedDocumentArtifact,
      diagnostic: buildProcessedDocumentDiagnostic(
        document,
        indexedDocumentArtifact.chunks.length,
        'embed',
        parsed.ocrDisposition
      )
    }
  } catch (error) {
    return {
      document,
      indexedDocument: null,
      diagnostic: {
        documentName: document.documentName,
        sourceBucket: document.sourceBucket,
        sourceKey: document.sourceKey,
        status: 'failed',
        usable: false,
        chunkCount: 0,
        ocrDisposition,
        stage,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

type ScoredValidationDocumentDiagnostic = {
  document: ValidationSourceDocument
  workSelection: ValidationDocumentWorkSelectionDiagnostic
}

type FirstPassRerankingSignal = 'high' | 'medium' | 'low'
type HeuristicGroupKeyDiagnostic = {
  heuristicGroupKey?: string
  heuristicGroupKeySource?: 'filename-prefix'
}
type FirstPassRerankingAdjustmentDiagnostic = {
  scoreDelta: number
  reason: string
}

export function scoreValidationDocuments(
  documents: ValidationSourceDocument[],
  formFields: DateValidationFieldInput[]
): ScoredValidationDocumentDiagnostic[] {
  const scoredDocuments = documents.map((document, index) => {
    const normalizedName =
      `${document.documentName} ${document.sourceKey}`.toLowerCase()
    const reasons = ['Eligible PDF remains in the all-document processing set.']
    let priorityScore = 10

    if (containsAny(normalizedName, ['contract', 'agreement'])) {
      priorityScore += 6
      reasons.push('Filename/key looks contract-oriented.')
    }

    if (containsAny(normalizedName, ['amend', 'amendment'])) {
      priorityScore += 4
      reasons.push(
        'Amendment-style naming can contain controlling date changes.'
      )
    }

    if (
      formFields.some((field) => field.field === 'contractStartDate') &&
      containsAny(normalizedName, ['effective', 'start', 'begin'])
    ) {
      priorityScore += 3
      reasons.push('Filename/key hints at start-date or effective-date content.')
    }

    if (
      formFields.some((field) => field.field === 'contractEndDate') &&
      containsAny(normalizedName, ['term', 'end', 'expire', 'expiration'])
    ) {
      priorityScore += 3
      reasons.push('Filename/key hints at term or expiration content.')
    }

    if (containsAny(normalizedName, ['rate', 'pricing', 'fee'])) {
      priorityScore -= 4
      reasons.push(
        'Filename/key looks rate-oriented rather than date-governing.'
      )
    }

    return {
      document,
      originalIndex: index,
      priorityScore,
      reasons
    }
  })

  const firstPassCacheKeys = new Set(
    [...scoredDocuments]
      .sort(
        (left, right) =>
          right.priorityScore - left.priorityScore ||
          left.originalIndex - right.originalIndex
      )
      .slice(0, DIAGNOSTIC_FIRST_PASS_DOCUMENT_LIMIT)
      .map((document) => computeDocumentCacheKey(document.document))
  )

  return scoredDocuments.map(({ document, priorityScore, reasons }) => ({
    document,
    workSelection: {
      priorityScore,
      priorityReasons: reasons,
      bucket: firstPassCacheKeys.has(computeDocumentCacheKey(document))
        ? 'first-pass'
        : 'deferred'
    }
  }))
}

async function rerankValidationDocuments(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  unchangedDocumentCacheKeys: Set<string>
  scoredDocuments: ScoredValidationDocumentDiagnostic[]
}): Promise<{
  scoredDocuments: ScoredValidationDocumentDiagnostic[]
  diagnostics: ValidationRerankingDiagnostics
}> {
  const rerankingStartedAt = Date.now()
  const rerankingCandidates = selectFirstPassRerankingCandidates(
    args.scoredDocuments
  )

  if (rerankingCandidates.length === 0) {
    return {
      scoredDocuments: args.scoredDocuments,
      diagnostics: {
        candidateCount: 0,
        sampledDocumentCount: 0,
        cachedSampleCount: 0,
        freshSampleCount: 0,
        sampleUnavailableCount: 0,
        llmRequestCount: 0,
        sampleFetchElapsedMs: 0,
        llmElapsedMs: 0,
        totalElapsedMs: 0
      }
    }
  }

  const validationClient = newValidationLlmClient(args.event.validationLlmConfig)
  const rerankedAdjustments = await mapWithConcurrencyLimit(
    rerankingCandidates,
    FIRST_PASS_RERANKING_CONCURRENCY,
    async (diagnostic) => {
      let sampleSource: 'cached' | 'fresh' | null = null
      let llmRequested = false
      const sampleStartedAt = Date.now()
      try {
        const sample = await readFirstPassRerankingSample({
          event: args.event,
          s3Client: args.s3Client,
          unchangedDocumentCacheKeys: args.unchangedDocumentCacheKeys,
          document: diagnostic.document
        })
        const sampleFetchElapsedMs = Date.now() - sampleStartedAt

        if (sample == null) {
          return [
            computeDocumentCacheKey(diagnostic.document),
            {
              scoreDelta: 0,
              reason: 'Sample unavailable; kept heuristic first-pass ranking.'
            },
            {
              sampleFetchElapsedMs,
              llmElapsedMs: 0,
              sampleSource,
              llmRequested
            }
          ] as const
        }
        sampleSource = sample.sampleSource

        llmRequested = true
        const llmStartedAt = Date.now()
        const signal = parseFirstPassRerankingSignal(
          (
            await validationClient.generateValidation({
              prompt: buildFirstPassRerankingPrompt({
                document: diagnostic.document,
                formFields: args.event.formFields,
                pageCount: sample.pageCount,
                fileSizeBytes: sample.fileSizeBytes,
                sampleText: sample.sampleText
              })
            })
          ).rawText
        )
        const llmElapsedMs = Date.now() - llmStartedAt

        if (signal == null) {
          return [
            computeDocumentCacheKey(diagnostic.document),
            {
              scoreDelta: 0,
              reason:
                'LLM reranking response was unusable; kept heuristic score.'
            },
            {
              sampleFetchElapsedMs,
              llmElapsedMs,
              sampleSource,
              llmRequested
            }
          ] as const
        }

        return [
          computeDocumentCacheKey(diagnostic.document),
          buildFirstPassRerankingAdjustment(signal, sample),
          {
            sampleFetchElapsedMs,
            llmElapsedMs,
            sampleSource,
            llmRequested
          }
        ] as const
      } catch {
        return [
          computeDocumentCacheKey(diagnostic.document),
          {
            scoreDelta: 0,
            reason: 'LLM reranking failed; kept heuristic first-pass ranking.'
          },
          {
            sampleFetchElapsedMs: Date.now() - sampleStartedAt,
            llmElapsedMs: 0,
            sampleSource,
            llmRequested
          }
        ] as const
      }
    }
  )

  const adjustmentByCacheKey = new Map(
    rerankedAdjustments.map(([cacheKey, adjustment]) => [cacheKey, adjustment])
  )
  const diagnostics: ValidationRerankingDiagnostics = {
    candidateCount: rerankingCandidates.length,
    sampledDocumentCount: rerankedAdjustments.filter(
      ([, , diagnostic]) => diagnostic.sampleSource != null
    ).length,
    cachedSampleCount: rerankedAdjustments.filter(
      ([, , diagnostic]) => diagnostic.sampleSource === 'cached'
    ).length,
    freshSampleCount: rerankedAdjustments.filter(
      ([, , diagnostic]) => diagnostic.sampleSource === 'fresh'
    ).length,
    sampleUnavailableCount: rerankedAdjustments.filter(
      ([, , diagnostic]) => diagnostic.sampleSource == null
    ).length,
    llmRequestCount: rerankedAdjustments.filter(
      ([, , diagnostic]) => diagnostic.llmRequested
    ).length,
    sampleFetchElapsedMs: rerankedAdjustments.reduce(
      (total, [, , diagnostic]) => total + diagnostic.sampleFetchElapsedMs,
      0
    ),
    llmElapsedMs: rerankedAdjustments.reduce(
      (total, [, , diagnostic]) => total + diagnostic.llmElapsedMs,
      0
    ),
    totalElapsedMs: Date.now() - rerankingStartedAt
  }
  const rescoredDocuments = args.scoredDocuments.map((diagnostic, index) => {
    const cacheKey = computeDocumentCacheKey(diagnostic.document)
    const adjustment = adjustmentByCacheKey.get(cacheKey)
    const heuristicGroupDiagnostic = buildHeuristicGroupKeyDiagnostic(
      diagnostic.document
    )
    const priorityScore =
      diagnostic.workSelection.priorityScore + (adjustment?.scoreDelta ?? 0)
    const priorityReasons = [
      ...diagnostic.workSelection.priorityReasons,
      ...(adjustment ? [adjustment.reason] : []),
      ...(heuristicGroupDiagnostic.heuristicGroupKey != null
        ? [
            `Heuristic grouping only: treated this document as part of advisory group "${heuristicGroupDiagnostic.heuristicGroupKey}".`
          ]
        : [])
    ]

    return {
      diagnostic,
      cacheKey,
      originalIndex: index,
      priorityScore,
      priorityReasons,
      ...heuristicGroupDiagnostic
    }
  })

  const { rerankedFirstPassCacheKeys, diversityReasonsByCacheKey } =
    selectCoverageAwareFirstPassCacheKeys(rescoredDocuments)

  return {
    scoredDocuments: rescoredDocuments.map(
      ({
        diagnostic,
        cacheKey,
        priorityScore,
        priorityReasons,
        heuristicGroupKey,
        heuristicGroupKeySource
      }) => ({
        document: diagnostic.document,
        workSelection: {
          priorityScore,
          priorityReasons: [
            ...priorityReasons,
            ...(diversityReasonsByCacheKey.get(cacheKey) ?? [])
          ],
          bucket: rerankedFirstPassCacheKeys.has(cacheKey)
            ? 'first-pass'
            : 'deferred',
          ...(heuristicGroupKey != null
            ? {
                heuristicGroupKey,
                heuristicGroupKeySource
              }
            : {})
        }
      })
    ),
    diagnostics
  }
}

function selectFirstPassRerankingCandidates(
  scoredDocuments: ScoredValidationDocumentDiagnostic[]
): ScoredValidationDocumentDiagnostic[] {
  const orderedDocuments = scoredDocuments
    .map((document, originalIndex) => ({
      document,
      originalIndex
    }))
    .sort(
      (left, right) =>
        right.document.workSelection.priorityScore -
          left.document.workSelection.priorityScore ||
        // Keep original submission order as a weak tie-breaker so one late
        // sibling cluster does not crowd out earlier amendment candidates
        // before the advisory coverage step can widen the reranking pool.
        left.originalIndex - right.originalIndex
    )
    .map((entry) => entry.document)
  const priorityCandidates = orderedDocuments.slice(
    0,
    Math.min(
      FIRST_PASS_RERANKING_PRIORITY_CANDIDATE_LIMIT,
      FIRST_PASS_RERANKING_CANDIDATE_LIMIT
    )
  )
  const remainingCandidates = orderedDocuments.slice(priorityCandidates.length)
  const candidatePool = [...priorityCandidates]
  const representedGroups = new Set(
    priorityCandidates.flatMap((document) => {
      const heuristicGroupKey = buildHeuristicGroupKeyDiagnostic(
        document.document
      ).heuristicGroupKey

      return heuristicGroupKey != null ? [heuristicGroupKey] : []
    })
  )

  for (const candidate of remainingCandidates) {
    if (candidatePool.length >= FIRST_PASS_RERANKING_CANDIDATE_LIMIT) {
      break
    }

    const heuristicGroupKey = buildHeuristicGroupKeyDiagnostic(
      candidate.document
    ).heuristicGroupKey

    if (
      heuristicGroupKey != null &&
      !representedGroups.has(heuristicGroupKey)
    ) {
      candidatePool.push(candidate)
      representedGroups.add(heuristicGroupKey)
    }
  }

  for (const candidate of remainingCandidates) {
    if (candidatePool.length >= FIRST_PASS_RERANKING_CANDIDATE_LIMIT) {
      break
    }

    if (
      candidatePool.some(
        (selectedCandidate) =>
          computeDocumentCacheKey(selectedCandidate.document) ===
          computeDocumentCacheKey(candidate.document)
      )
    ) {
      continue
    }

    candidatePool.push(candidate)
  }

  return candidatePool
}

function attachWorkSelectionDiagnostic(
  diagnostic: ValidationDocumentDiagnostic,
  workSelection?: ValidationDocumentWorkSelectionDiagnostic
): ValidationDocumentDiagnostic {
  if (workSelection == null) {
    return diagnostic
  }

  return {
    ...diagnostic,
    workSelection
  }
}

function containsAny(value: string, substrings: string[]): boolean {
  return substrings.some((substring) => value.includes(substring))
}

async function readFirstPassRerankingSample(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  unchangedDocumentCacheKeys: Set<string>
  document: ValidationSourceDocument
}): Promise<{
  pageCount: number
  fileSizeBytes: number | null
  sampleText: string
  sampleSource: 'cached' | 'fresh'
} | null> {
  const cacheKey = computeDocumentCacheKey(args.document)
  const parsedDocumentArtifactKey = getParsedDocumentArtifactKey(
    args.event.formId,
    cacheKey
  )

  if (args.unchangedDocumentCacheKeys.has(cacheKey)) {
    const parsedArtifact = await readOptionalArtifact<ParsedDocumentArtifact>(
      args.s3Client,
      args.event.bucket,
      parsedDocumentArtifactKey
    )

    if (parsedArtifact != null) {
      return {
        pageCount: parsedArtifact.pageCount,
        // Reuse the cached first pages when we have them so reranking does not
        // re-download unchanged PDFs just to recover advisory metadata.
        fileSizeBytes: null,
        sampleSource: 'cached',
        sampleText: clipFirstPassSampleText(
          parsedArtifact.pageTexts
            .slice(0, FIRST_PASS_RERANKING_SAMPLE_PAGE_LIMIT)
            .join('\n\n')
        )
      }
    }
  }

  const fileBuffer = await args.s3Client.getBuffer(
    args.document.sourceBucket,
    args.document.sourceKey
  )
  const sample = await extractPdfTextSample(
    fileBuffer,
    args.document.documentName,
    FIRST_PASS_RERANKING_SAMPLE_PAGE_LIMIT
  )

  return {
    pageCount: sample.pageCount,
    fileSizeBytes: fileBuffer.byteLength,
    sampleSource: 'fresh',
    sampleText: clipFirstPassSampleText(sample.pageTexts.join('\n\n'))
  }
}

function clipFirstPassSampleText(value: string): string {
  return value.slice(0, FIRST_PASS_RERANKING_SAMPLE_CHAR_LIMIT).trim()
}

function buildFirstPassRerankingPrompt(args: {
  document: ValidationSourceDocument
  formFields: DateValidationFieldInput[]
  pageCount: number
  fileSizeBytes: number | null
  sampleText: string
}): string {
  return [
    'You are reranking PDFs for a first-pass contract date validation workflow.',
    'Return exactly one token: HIGH, MEDIUM, or LOW.',
    'HIGH means the document likely contains operative contract start date, end date, term, effective date, expiration date, or amendment language that should be processed early.',
    'LOW means the document looks like generic scope, rates, operational, or boilerplate text that is unlikely to help contract date validation early.',
    'For large documents, only return HIGH when the first 1-2 pages already contain clear operative date-governing language such as START DATE, THROUGH END DATE, effective date, term amendment, or an explicit statement extending or changing the contract term.',
    'For large documents, generic date mentions, signature dates, page headers, service-overview text, scope-of-work text, definitions, or rates language are not enough for HIGH.',
    'If the first 1-2 pages mostly contain scope-of-work, service overview, definitions, rates, or other generic boilerplate without clear date-governing language, return LOW.',
    'Do not infer HIGH from filename or page count alone.',
    'Prefer HIGH when the sample already shows one or both target contract dates or an explicit amendment/term statement that directly governs them.',
    `Document name: ${args.document.documentName}`,
    `Source key: ${args.document.sourceKey}`,
    `Page count: ${args.pageCount}`,
    `File size bytes: ${args.fileSizeBytes ?? 'unknown'}`,
    'Target form fields:',
    ...args.formFields.map(
      (field) => `- ${field.label} (${field.field}): ${field.value}`
    ),
    'Sample text from the first 1-2 pages:',
    args.sampleText || '[no sample text available]'
  ].join('\n')
}

function parseFirstPassRerankingSignal(
  rawText: string
): FirstPassRerankingSignal | null {
  const match = rawText.toUpperCase().match(/\b(HIGH|MEDIUM|LOW)\b/)

  if (match == null) {
    return null
  }

  return match[1].toLowerCase() as FirstPassRerankingSignal
}

function buildFirstPassRerankingAdjustment(
  signal: FirstPassRerankingSignal,
  sample: { pageCount: number; fileSizeBytes: number | null }
): { scoreDelta: number; reason: string } {
  const isLargeDocument =
    sample.pageCount >= LARGE_DOCUMENT_PAGE_THRESHOLD ||
    (sample.fileSizeBytes != null &&
      sample.fileSizeBytes >= LARGE_DOCUMENT_SIZE_BYTES_THRESHOLD)

  if (signal === 'high') {
    return {
      scoreDelta: HIGH_YIELD_LLM_PRIORITY_BOOST,
      reason:
        'LLM reranking kept this document earlier because the first 1-2 page sample looks date-governing.'
    }
  }

  if (signal === 'low' && isLargeDocument) {
    return {
      scoreDelta: -LOW_YIELD_LLM_PRIORITY_PENALTY,
      reason:
        'LLM reranking deprioritized this large document because the first 1-2 page sample looks low-yield for contract date validation.'
    }
  }

  if (isLargeDocument) {
    return {
      scoreDelta: -LARGE_DOCUMENT_NON_HIGH_PRIORITY_PENALTY,
      reason:
        'LLM reranking did not find clear date-governing language in the first 1-2 pages, so this large document was deferred from the first pass.'
    }
  }

  if (signal === 'low') {
    return {
      scoreDelta: -2,
      reason:
        'LLM reranking slightly lowered this document because the sampled text looks weak for contract date validation.'
    }
  }

  return {
    scoreDelta: 0,
    reason: 'LLM reranking kept the heuristic score unchanged.'
  }
}

export function selectFirstPassDocuments(
  scoredDocuments: ScoredValidationDocumentDiagnostic[]
): ValidationSourceDocument[] {
  return scoredDocuments
    .filter((diagnostic) => diagnostic.workSelection.bucket === 'first-pass')
    .sort(
      (left, right) =>
        Number(isRecommendedFirstPassWorkSelection(right)) -
          Number(isRecommendedFirstPassWorkSelection(left)) ||
        right.workSelection.priorityScore - left.workSelection.priorityScore
    )
    .map((diagnostic) => diagnostic.document)
}

function buildHeuristicGroupKeyDiagnostic(
  document: ValidationSourceDocument
): HeuristicGroupKeyDiagnostic {
  const baseName = document.documentName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/^\d+\s+plan\s+cp\s+/i, '')
    .trim()
  const agreementNumberMatch = baseName.match(/\b\d{2}-\d{5}\b/)

  if (agreementNumberMatch == null || agreementNumberMatch.index == null) {
    return {}
  }

  const groupKey = baseName
    .slice(0, agreementNumberMatch.index)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  if (groupKey.length === 0) {
    return {}
  }

  return {
    heuristicGroupKey: groupKey,
    heuristicGroupKeySource: 'filename-prefix'
  }
}

function selectCoverageAwareFirstPassCacheKeys(
  rescoredDocuments: Array<{
    cacheKey: string
    originalIndex: number
    priorityScore: number
    priorityReasons: string[]
    heuristicGroupKey?: string
  }>
): {
  rerankedFirstPassCacheKeys: Set<string>
  diversityReasonsByCacheKey: Map<string, string[]>
} {
  const remainingDocuments = [...rescoredDocuments].sort(
    (left, right) =>
      right.priorityScore - left.priorityScore ||
      left.originalIndex - right.originalIndex
  )
  const selectedCacheKeys = new Set<string>()
  const selectedHeuristicGroups = new Set<string>()
  const diversityReasonsByCacheKey = new Map<string, string[]>()

  while (
    selectedCacheKeys.size < DIAGNOSTIC_FIRST_PASS_DOCUMENT_LIMIT &&
    remainingDocuments.length > 0
  ) {
    const baselineDocument = remainingDocuments[0]
    const baselinePriorityScore = baselineDocument.priorityScore
    const nearPeerDocuments = remainingDocuments.filter(
      (document) =>
        baselinePriorityScore - document.priorityScore <=
        FIRST_PASS_DIVERSITY_SCORE_BAND
    )
    const diversifiedDocument =
      baselineDocument.heuristicGroupKey != null &&
      selectedHeuristicGroups.has(baselineDocument.heuristicGroupKey)
        ? nearPeerDocuments.find(
            (document) =>
              document.heuristicGroupKey != null &&
              !selectedHeuristicGroups.has(document.heuristicGroupKey)
          )
        : undefined
    const selectedDocument = diversifiedDocument ?? baselineDocument

    selectedCacheKeys.add(selectedDocument.cacheKey)
    if (selectedDocument.heuristicGroupKey != null) {
      selectedHeuristicGroups.add(selectedDocument.heuristicGroupKey)
    }
    if (diversifiedDocument != null) {
      diversityReasonsByCacheKey.set(selectedDocument.cacheKey, [
        `Heuristic diversity tie-break only: selected this near-peer from advisory group "${selectedDocument.heuristicGroupKey}" to avoid over-clustering the first pass.`
      ])
    }

    const selectedIndex = remainingDocuments.findIndex(
      (document) => document.cacheKey === selectedDocument.cacheKey
    )
    remainingDocuments.splice(selectedIndex, 1)
  }

  return {
    rerankedFirstPassCacheKeys: selectedCacheKeys,
    diversityReasonsByCacheKey
  }
}

export function buildFieldWorkSelectionDiagnostics(args: {
  formFields: DateValidationFieldInput[]
  results: DateValidationResult[]
  retrievalDiagnostics: Map<
    DateValidationFieldInput['field'],
    ValidationRetrievalDiagnostic
  >
  documentDiagnostics: ValidationDocumentDiagnostic[]
  workSelectionMode: 'all-doc' | 'gated-first-pass' | 'gated-fallback'
  deferredDocumentNames: Set<string>
}): ValidationFieldWorkSelectionDiagnostic[] {
  return args.formFields.map((field) => {
    const result = args.results.find((candidate) => candidate.field === field.field)

    if (args.workSelectionMode === 'all-doc' || result == null) {
      return {
        field: field.field,
        evidenceSource: 'all-doc'
      }
    }

    const fallbackReasons = buildFallbackReasons({
      result,
      retrievalDiagnostic: args.retrievalDiagnostics.get(field.field),
      documentDiagnostics: args.documentDiagnostics
    })
    const citedDeferredDocument = result.citations.some((citation) =>
      args.deferredDocumentNames.has(citation.documentName)
    )

    return {
      field: field.field,
      evidenceSource:
        citedDeferredDocument
          ? 'fallback'
          : fallbackReasons.length > 0
            ? 'partial'
            : 'first-pass',
      ...(fallbackReasons.length > 0 ? { fallbackReasons } : {})
    }
  })
}

function hasSufficientFirstPassEvidence(
  fieldWorkSelectionDiagnostics: ValidationFieldWorkSelectionDiagnostic[]
): boolean {
  return fieldWorkSelectionDiagnostics.every(
    (diagnostic) => diagnostic.evidenceSource === 'first-pass'
  )
}

function buildFallbackReasons(args: {
  result: DateValidationResult
  retrievalDiagnostic?: ValidationRetrievalDiagnostic
  documentDiagnostics: ValidationDocumentDiagnostic[]
}): string[] {
  const fallbackReasons = new Set<string>()
  const hasAmbiguousMessage = hasAmbiguousOrConflictingResultMessage(args.result)
  const hasStrongResolvedFieldEvidence = hasStrongResolvedFieldEvidenceForFallback(
    args.result
  )

  if (args.result.outcome === 'not-enough-evidence') {
    fallbackReasons.add('not-enough-evidence')
  }

  if (hasAmbiguousMessage) {
    fallbackReasons.add('ambiguity')
  }

  if (args.result.citations.length === 0) {
    fallbackReasons.add('missing-citations')
  }

  if (!hasStrongResolvedFieldEvidence) {
    // Keep coverage gaps conservative for unresolved fields, but do not let
    // unrelated OCR-capped/failed first-pass documents force fallback when the
    // field already has strong cited evidence from successfully processed docs.
    if (
      args.documentDiagnostics.some(
        (diagnostic) =>
          diagnostic.status === 'failed' ||
          diagnostic.reason === 'ocr-capped-large-batch'
      )
    ) {
      fallbackReasons.add('partial-coverage')
    }

    if (
      args.documentDiagnostics.some(
        (diagnostic) =>
          diagnostic.ocrDisposition === 'skipped' ||
          diagnostic.reason === 'ocr-capped-large-batch'
      )
    ) {
      fallbackReasons.add('ocr-gaps')
    }

    if (
      args.documentDiagnostics.some(
        (diagnostic) => diagnostic.status === 'failed'
      )
    ) {
      fallbackReasons.add('failed-documents')
    }
  }

  if (args.result.confidence !== 'high') {
    fallbackReasons.add('weak-field-evidence')
  }

  if (
    !hasStrongResolvedFieldEvidence &&
    (args.retrievalDiagnostic?.competingDateCount ?? 0) > 1
  ) {
    fallbackReasons.add('conflicting-date-evidence')
  }

  return [...fallbackReasons]
}

function hasStrongResolvedFieldEvidenceForFallback(
  result: DateValidationResult
): boolean {
  return (
    result.outcome !== 'not-enough-evidence' &&
    result.confidence === 'high' &&
    result.citations.length > 0 &&
    !hasAmbiguousOrConflictingResultMessage(result)
  )
}

function hasAmbiguousOrConflictingResultMessage(
  result: DateValidationResult
): boolean {
  const message = result.message.toLowerCase()

  return message.includes('ambiguous') || message.includes('conflicting')
}

function isRecommendedFirstPassWorkSelection(
  diagnostic: ScoredValidationDocumentDiagnostic
): boolean {
  return diagnostic.workSelection.priorityReasons.some(
    (reason) =>
      reason.includes('Amendment-style naming') ||
      reason.includes('start-date or effective-date') ||
      reason.includes('term or expiration')
  )
}

function mergeDocumentDiagnostics(
  existingDiagnostics: ValidationDocumentDiagnostic[],
  nextDiagnostics: ValidationDocumentDiagnostic[]
): ValidationDocumentDiagnostic[] {
  const diagnosticsByCacheKey = new Map(
    existingDiagnostics.map((diagnostic) => [
      computeDocumentCacheKey({
        documentName: diagnostic.documentName,
        sourceBucket: diagnostic.sourceBucket ?? '',
        sourceKey: diagnostic.sourceKey ?? diagnostic.documentName
      }),
      diagnostic
    ])
  )

  for (const diagnostic of nextDiagnostics) {
    diagnosticsByCacheKey.set(
      computeDocumentCacheKey({
        documentName: diagnostic.documentName,
        sourceBucket: diagnostic.sourceBucket ?? '',
        sourceKey: diagnostic.sourceKey ?? diagnostic.documentName
      }),
      diagnostic
    )
  }

  return [...diagnosticsByCacheKey.values()]
}

function buildDeferredDocumentDiagnostic(
  document: ValidationSourceDocument,
  workSelection?: ValidationDocumentWorkSelectionDiagnostic,
  reason = 'deferred-first-pass'
): ValidationDocumentDiagnostic {
  return {
    documentName: document.documentName,
    sourceBucket: document.sourceBucket,
    sourceKey: document.sourceKey,
    status: 'skipped',
    usable: false,
    chunkCount: 0,
    ...(workSelection ? { workSelection } : {}),
    reason
  }
}

function buildProcessedDocumentDiagnostic(
  document: ValidationSourceDocument,
  chunkCount: number,
  stage: NonNullable<ValidationDocumentDiagnostic['stage']>,
  ocrDisposition: PdfOcrDisposition = 'not-needed'
): ValidationDocumentDiagnostic {
  return {
    documentName: document.documentName,
    sourceBucket: document.sourceBucket,
    sourceKey: document.sourceKey,
    status: 'processed',
    usable: true,
    chunkCount,
    ocrDisposition,
    stage
  }
}

export function createOcrFallbackPolicy(documentCount: number): () => boolean {
  if (documentCount < LARGE_BATCH_OCR_TRIGGER_DOCUMENT_COUNT) {
    return () => true
  }

  let attemptedFallbacks = 0

  return () => {
    if (attemptedFallbacks >= LARGE_BATCH_OCR_FALLBACK_LIMIT) {
      return false
    }

    attemptedFallbacks += 1
    return true
  }
}

function reconcileValidationResults(
  results: DateValidationResult[],
  chunks: Array<{
    chunkId: string
    documentName: string
    order: number
    page: number | null
    startPage: number | null
    endPage: number | null
  }>
): DateValidationResult[] {
  // Trust the model for semantic judgment, but not for source metadata. We map
  // every returned citation back onto known chunk metadata before persisting it.
  const chunkMetadataById = new Map(
    chunks.map((chunk) => [
      chunk.chunkId,
      {
        documentName: chunk.documentName,
        order: chunk.order,
        page: chunk.page,
        startPage: chunk.startPage,
        endPage: chunk.endPage
      }
    ])
  )

  return results.map((result) => ({
    ...result,
    citations: result.citations.flatMap((citation) => {
      const knownChunk = chunkMetadataById.get(citation.chunkId)

      if (!knownChunk) {
        // Drop unknown chunk IDs instead of persisting model-invented evidence.
        return []
      }

      return [
        {
          chunkId: citation.chunkId,
          documentName: knownChunk.documentName,
          page: knownChunk.page,
          ...(knownChunk.startPage != null
            ? { startPage: knownChunk.startPage }
            : {}),
          ...(knownChunk.endPage != null
            ? { endPage: knownChunk.endPage }
            : {}),
          order: knownChunk.order
        }
      ]
    })
  }))
}

function dedupeValidationCitations(
  citations: DateValidationResult['citations']
): DateValidationResult['citations'] {
  const seenChunkIds = new Set<string>()

  return citations.filter((citation) => {
    if (seenChunkIds.has(citation.chunkId)) {
      return false
    }

    seenChunkIds.add(citation.chunkId)
    return true
  })
}

export function addSupportingCitationData(args: {
  formFields: DateValidationFieldInput[]
  results: DateValidationResult[]
  retrievedChunksByField: Map<
    DateValidationFieldInput['field'],
    Array<{
      chunkId: string
      documentName: string
      page: number | null
      startPage: number | null
      endPage: number | null
      order: number
      text: string
    }>
  >
  retrievalDiagnostics: Map<
    DateValidationFieldInput['field'],
    ValidationRetrievalDiagnostic
  >
}): DateValidationResult[] {
  return args.results.map((result) => {
    const field = args.formFields.find((candidate) => candidate.field === result.field)

    if (!field || result.citations.length === 0) {
      return result
    }

    // Keep one lead primary document for the Review page and demote additional
    // agreeing documents into supporting references without changing the
    // underlying validation outcome.
    const leadPrimaryDocumentName = result.citations[0]?.documentName
    const primaryCitations = dedupeValidationCitations(
      result.citations.filter(
        (citation) => citation.documentName === leadPrimaryDocumentName
      )
    )
    const demotedPrimarySupportingCitations = dedupeValidationCitations(
      result.citations.filter(
        (citation) => citation.documentName !== leadPrimaryDocumentName
      )
    )
    const retrievedChunks = args.retrievedChunksByField.get(field.field) ?? []
    const primaryDocumentDate = resolveDisplayedDocumentDateFromCitedChunks({
      field: field.field,
      retrievedChunks,
      citations: primaryCitations
    })

    if (!primaryDocumentDate) {
      return {
        ...result,
        citations: primaryCitations
      }
    }

    const primaryChunkIds = new Set(primaryCitations.map((citation) => citation.chunkId))
    const primaryDocumentNames = new Set(
      primaryCitations.map((citation) => citation.documentName)
    )
    const retrievedChunksByDocument = retrievedChunks.reduce(
      (grouped, chunk) => {
        const existing = grouped.get(chunk.documentName) ?? []
        existing.push(chunk)
        grouped.set(chunk.documentName, existing)
        return grouped
      },
      new Map<string, typeof retrievedChunks>()
    )
    const supportingCitations = dedupeValidationCitations(
      [
        ...demotedPrimarySupportingCitations,
        ...[...retrievedChunksByDocument.values()].flatMap((documentChunks) => {
        if (documentChunks.length === 0) {
          return []
        }

        if (primaryDocumentNames.has(documentChunks[0].documentName)) {
          return []
        }

        const resolvedSupport = resolveSupportedFieldDateFromChunks(
          field.field,
          documentChunks
        )

        if (!resolvedSupport || resolvedSupport.date !== primaryDocumentDate) {
          return []
        }

        return resolvedSupport.chunks.map((chunk) => ({
          chunkId: chunk.chunkId,
          documentName: chunk.documentName,
          page: chunk.page,
          ...(chunk.startPage != null ? { startPage: chunk.startPage } : {}),
          ...(chunk.endPage != null ? { endPage: chunk.endPage } : {}),
          order: chunk.order
        }))
      })
      ].filter((citation) => !primaryChunkIds.has(citation.chunkId))
    )
    const supportingDocumentCount = new Set([
      ...primaryCitations.map((citation) => citation.documentName),
      ...supportingCitations.map((citation) => citation.documentName)
    ]).size
    const consideredDocumentCount =
      args.retrievalDiagnostics.get(field.field)?.representedDocumentCount ??
      new Set(retrievedChunks.map((chunk) => chunk.documentName)).size

    return {
      ...result,
      citations: primaryCitations,
      ...(supportingCitations.length > 0 ? { supportingCitations } : {}),
      evidenceSummary: {
        consideredDocumentCount,
        supportingDocumentCount
      }
    }
  })
}

function buildEmptyValidationPhaseTimingSummary(): ValidationPhaseTimingSummary {
  return {
    fetch: 0,
    parse: 0,
    ocr: 0,
    chunk: 0,
    embed: 0,
    retrieval: 0,
    validation: 0
  }
}

async function readOptionalArtifact<T>(
  s3Client: ArtifactS3Client,
  bucket: string,
  key: string
): Promise<T | null> {
  try {
    return await s3Client.getJson<T>(bucket, key)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('S3 object not found')
    ) {
      return null
    }

    throw error
  }
}

async function measureValidationPhase<T>(
  event: ValidationHandlerEvent,
  phase: ValidationPhaseTimingDiagnostic['phase'],
  run: () => Promise<T>
): Promise<T> {
  if (!event.diagnostics) {
    return run()
  }

  const startedAt = Date.now()

  try {
    return await run()
  } finally {
    event.diagnostics?.recordPhaseTiming(phase, Date.now() - startedAt)
  }
}

function measureValidationPhaseSync<T>(
  event: ValidationHandlerEvent,
  phase: ValidationPhaseTimingDiagnostic['phase'],
  run: () => T
): T {
  if (!event.diagnostics) {
    return run()
  }

  const startedAt = Date.now()

  try {
    return run()
  } finally {
    event.diagnostics?.recordPhaseTiming(phase, Date.now() - startedAt)
  }
}

async function parsePdfWithDiagnostics(
  event: ValidationHandlerEvent,
  fileBuffer: Buffer,
  documentName: string,
  shouldAttemptOcrFallback: () => boolean
): ReturnType<typeof parsePdf> {
  if (!event.diagnostics) {
    return parsePdf(fileBuffer, documentName, {
      shouldAttemptOcrFallback
    })
  }

  const startedAt = Date.now()
  const parsed = await parsePdf(fileBuffer, documentName, {
    shouldAttemptOcrFallback
  })
  const elapsedMs = Date.now() - startedAt

  event.diagnostics.recordPhaseTiming('parse', elapsedMs)
  if (parsed.extractionMethod === 'ocr') {
    event.diagnostics.recordPhaseTiming('ocr', elapsedMs)
  }

  return parsed
}

async function persistParsedDocumentArtifact(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  parsedDocumentArtifactKey: string
  document: ValidationSourceDocument
  parsed: Awaited<ReturnType<typeof parsePdf>>
}) {
  await args.s3Client.putJson(
    args.event.bucket,
    args.parsedDocumentArtifactKey,
    buildParsedDocumentArtifact({
      documentName: args.document.documentName,
      sourceBucket: args.document.sourceBucket,
      sourceKey: args.document.sourceKey,
      pageCount: args.parsed.pageCount,
      rawText: args.parsed.rawText,
      pageTexts: args.parsed.pageTexts,
      extractionMethod: args.parsed.extractionMethod,
      extractionNotes: args.parsed.extractionNotes,
      ocrDisposition: args.parsed.ocrDisposition
    })
  )
}

function buildParseResultFromArtifact(artifact: ParsedDocumentArtifact) {
  return {
    fileName: artifact.document.documentName,
    rawText: artifact.rawText,
    pageTexts: artifact.pageTexts,
    pageCount: artifact.pageCount,
    extractionMethod: artifact.extractionMethod,
    extractionNotes: artifact.extractionNotes,
    ocrDisposition: artifact.ocrDisposition
  }
}

function logMissingCitationPages(
  formId: string,
  results: DateValidationResult[]
): void {
  const citationsMissingPage = results.flatMap((result) =>
    result.citations.filter((citation) => citation.page == null)
  )

  if (citationsMissingPage.length === 0) {
    return
  }

  console.warn('Validation citations missing page metadata', {
    formId,
    count: citationsMissingPage.length,
    chunkIds: [
      ...new Set(citationsMissingPage.map((citation) => citation.chunkId))
    ]
  })
}

function parseSingleFieldValidationResponse(
  rawText: string,
  expectedField: DateValidationFieldInput['field']
): {
  result: DateValidationResult
  diagnostic?: {
    field: string
    issue:
      | ValidationResponseIssue
      | 'missing-field-result'
      | 'multiple-field-results'
    message: string
  }
} {
  let parsedValidation

  try {
    parsedValidation = parseValidationResponse(rawText)
  } catch (error) {
    const responseIssue = getValidationResponseIssue(error)

    if (responseIssue != null) {
      return {
        result: buildLlmFallbackResult(expectedField),
        diagnostic: {
          field: expectedField,
          issue: responseIssue,
          message:
            error instanceof Error
              ? error.message
              : `Validation response parse failed for ${expectedField}`
        }
      }
    }

    throw error
  }
  const matchingResults = parsedValidation.results.filter(
    (result) => result.field === expectedField
  )

  if (matchingResults.length === 0) {
    return {
      result: buildLlmFallbackResult(expectedField),
      diagnostic: {
        field: expectedField,
        issue: 'missing-field-result',
        message: `Validation model returned no result for ${expectedField}`
      }
    }
  }

  if (matchingResults.length > 1) {
    return {
      result: buildLlmFallbackResult(expectedField),
      diagnostic: {
        field: expectedField,
        issue: 'multiple-field-results',
        message: `Validation model returned ${matchingResults.length} results for ${expectedField}`
      }
    }
  }

  const [result] = matchingResults
  return { result }
}

function buildLlmFallbackResult(
  field: DateValidationFieldInput['field']
): DateValidationResult {
  return {
    field,
    outcome: 'not-enough-evidence',
    confidence: 'low',
    message: `No mention of ${formatFieldLabel(field)} in retrieved document chunks.`,
    decisionSource: 'llm',
    citations: []
  }
}

function getValidationResponseIssue(
  error: unknown
): ValidationResponseIssue | null {
  if (typeof error !== 'object' || error === null || !('issue' in error)) {
    return null
  }

  const issue = (error as { issue?: unknown }).issue

  if (
    issue === 'missing-json-array' ||
    issue === 'invalid-json' ||
    issue === 'invalid-result-shape'
  ) {
    return issue
  }

  return null
}

function formatFieldLabel(field: DateValidationFieldInput['field']): string {
  switch (field) {
    case 'contractStartDate':
      return 'contract start date'
    case 'contractEndDate':
      return 'contract end date'
    case 'amendmentEffectiveDate':
      return 'amendment effective date'
  }
}
