import {
  buildChunksArtifact,
  buildIndexedDocumentArtifact,
  classifyDocumentSetChanges,
  computeDocumentCacheKey,
  getChunksArtifactKey,
  getDocumentIndexArtifactKey,
  type ChunksArtifact,
  type IndexedDocumentArtifact
} from '../artifacts'
import { chunkDocument } from '../chunking'
import { XenovaEmbeddingProvider } from '../embeddings'
import { readReusableValidationResult } from './validationCache'
import { newValidationLlmClient } from '../llm'
import type { ValidationLlmConfig } from '../llm'
import { parsePdf } from '../parsing'
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
  type ValidationRetrievalDiagnostic
} from '../results'
import { newArtifactS3Client } from '../s3'
import type { ArtifactS3Client, ArtifactS3ClientConfig } from '../s3'
import {
  buildCompletedValidationStatusArtifact,
  buildFailedValidationStatusArtifact,
  buildValidationStatusArtifact,
  getValidationStatusKey
} from '../status'
import {
  normalizeLlmValidationResult,
  parseValidationResponse,
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
  phase:
    | 'fetch'
    | 'parse'
    | 'ocr'
    | 'chunk'
    | 'embed'
    | 'retrieval'
    | 'validation'
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
  s3Config: ArtifactS3ClientConfig
  validationLlmConfig?: ValidationLlmConfig
  formFields: DateValidationFieldInput[]
  documents: ValidationSourceDocument[]
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
// Pull a broader pool than the final prompt can hold so large submissions have
// a chance to surface evidence from more than one noisy top-ranked document.
export const FIELD_RETRIEVAL_CANDIDATE_COUNT = 8
// Keep the final pre-expansion evidence set small enough for the existing
// prompt shape while still allowing a couple of documents to contribute.
export const FIELD_RETRIEVAL_FINAL_CHUNK_LIMIT = 4
// Allow at most two chunks per document so one contract cannot crowd out all
// other candidates, but still preserve some same-document continuity.
export const FIELD_RETRIEVAL_MAX_CHUNKS_PER_DOCUMENT = 2

export async function validationHandler(
  event: ValidationHandlerEvent
): Promise<ValidationHandlerResult> {
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
      formSnapshotHash
    })

    if (reusableResult) {
      return {
        formId: event.formId,
        artifactVersion: event.artifactVersion,
        status: 'completed'
      }
    }

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildValidationStatusArtifact('parsing', event.artifactVersion)
    )

    const previousChunksArtifact = await readOptionalArtifact<ChunksArtifact>(
      s3Client,
      event.bucket,
      getChunksArtifactKey(event.formId)
    )
    const workSelectionDiagnostics = scoreValidationDocuments(
      event.documents,
      event.formFields
    )
    const workSelectionByCacheKey = new Map(
      workSelectionDiagnostics.map((diagnostic) => [
        computeDocumentCacheKey(diagnostic.document),
        diagnostic.workSelection
      ])
    )
    const documentChanges = classifyDocumentSetChanges(
      previousChunksArtifact?.documents ?? [],
      event.documents
    )
    const unchangedDocumentCacheKeys = new Set(
      documentChanges.unchanged.map((document) => document.cacheKey)
    )
    const embeddingProvider = new XenovaEmbeddingProvider()
    const embeddingModel = embeddingProvider.getModelInfo()
    const shouldAttemptOcrFallback = createOcrFallbackPolicy(
      event.documents.length
    )

    // Document-level failures stay isolated so one renamed or corrupt PDF does
    // not throw away usable evidence from the rest of the submission.
    const documentIndexingStartedAt = Date.now()
    const documentIndexingResults = await mapWithConcurrencyLimit(
      event.documents,
      DEFAULT_DOCUMENT_INDEXING_CONCURRENCY,
      (document) =>
        indexValidationDocument({
          event,
          s3Client,
          embeddingProvider,
          embeddingModel,
          unchangedDocumentCacheKeys,
          shouldAttemptOcrFallback,
          document
        })
    )
    const indexedDocuments = documentIndexingResults.flatMap((result) =>
      result.indexedDocument ? [result.indexedDocument] : []
    )
    documentDiagnostics = [
      ...documentDiagnostics,
      ...documentIndexingResults.map((result) =>
        attachWorkSelectionDiagnostic(
          result.diagnostic,
          workSelectionByCacheKey.get(computeDocumentCacheKey(result.document))
        )
      )
    ]
    // Keep large-run indexing metrics on the optional diagnostics hook so
    // evaluation can measure queue behavior without widening the persisted
    // product artifact contract in this ticket.
    event.diagnostics?.recordIndexingSummary?.({
      concurrencyLimit: DEFAULT_DOCUMENT_INDEXING_CONCURRENCY,
      totalElapsedMs: Date.now() - documentIndexingStartedAt,
      processedDocuments: indexedDocuments.length,
      failedDocuments: documentIndexingResults.length - indexedDocuments.length
    })

    if (indexedDocuments.length === 0) {
      throw new Error(
        `Validation could not index any usable documents for form ${event.formId}`
      )
    }

    // Rebuild the current form-level chunk snapshot from the active document
    // set so retrieval still sees one combined evidence pool for the form.
    const chunks = indexedDocuments.flatMap((document) => document.chunks)
    const chunkVectors = indexedDocuments.flatMap(
      (document) => document.chunkVectors
    )

    if (chunks.length === 0) {
      throw new Error(
        `Validation could not create chunks for form ${event.formId}`
      )
    }

    await s3Client.putJson(
      event.bucket,
      getChunksArtifactKey(event.formId),
      buildChunksArtifact(
        event.artifactVersion,
        chunks,
        indexedDocuments.map((document) => document.document)
      )
    )

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildValidationStatusArtifact('retrieving', event.artifactVersion)
    )

    // Build the in-memory retrieval index from the current chunk artifact. This
    // keeps the PoC simple while still exercising the same search contract a
    // production vector backend would eventually replace.
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
      event,
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
            event.formFields.map(async (field) => {
              const queryVector = await embeddingProvider.embedText(
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

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildValidationStatusArtifact(
        'deterministic-validation',
        event.artifactVersion
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

    await measureValidationPhase(event, 'validation', async () => {
      for (const field of event.formFields) {
        const retrievedChunksForField =
          retrievedChunksByField.get(field.field) ?? []
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
    // Persist LLM-path diagnostics alongside the artifact so evaluation can
    // distinguish malformed model output from a legitimate evidence miss
    // without changing the user-facing finding contract.
    const llmDiagnostics: Array<{
      field: string
      issue:
        | ValidationResponseIssue
        | 'missing-field-result'
        | 'multiple-field-results'
      message: string
    }> = []

    if (unresolvedFields.length > 0) {
      await s3Client.putJson(
        event.bucket,
        statusKey,
        buildValidationStatusArtifact('llm-validation', event.artifactVersion)
      )

      // Keep Ollama as the default runtime, but let evaluation code opt into a
      // Bedrock-backed client without reshaping the worker flow itself.
      const validationClient = newValidationLlmClient(event.validationLlmConfig)
      const llmResults = await measureValidationPhase(event, 'validation', () =>
        Promise.all(
          unresolvedFields.map(async ({ field, retrievedChunks }) => {
            // Convert only the unresolved field plus its own retrieved evidence
            // into the prompt so start and end dates do not share mixed context.
            const prompt = buildDateValidationPrompt({
              formFields: [field],
              retrievedChunks
            })

            const validationResponse =
              await validationClient.generateValidation({
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

            return reconcileValidationResults(
              [normalizedResult],
              retrievedChunks
            )
          })
        )
      )

      reconciledResults = [...reconciledResults, ...llmResults.flat()]
    }

    // Preserve input order so the frontend renders findings predictably.
    reconciledResults = event.formFields.flatMap((field) =>
      reconciledResults.filter((result) => result.field === field.field)
    )

    logMissingCitationPages(event.formId, reconciledResults)

    await s3Client.putJson(
      event.bucket,
      getValidationResultKey(event.formId),
      buildValidationResultArtifact(
        event.artifactVersion,
        // Persist the form-value hash alongside the results so later cache logic
        // can distinguish document changes from form-only edits.
        formSnapshotHash,
        reconciledResults,
        llmDiagnostics,
        event.formFields.flatMap((field) => {
          const diagnostic = retrievalDiagnostics.get(field.field)

          return diagnostic ? [diagnostic] : []
        }),
        documentDiagnostics
      )
    )

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildCompletedValidationStatusArtifact(
        event.artifactVersion,
        documentDiagnostics
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
        documentDiagnostics
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

async function indexValidationDocument(args: {
  event: ValidationHandlerEvent
  s3Client: ArtifactS3Client
  embeddingProvider: XenovaEmbeddingProvider
  embeddingModel: string
  unchangedDocumentCacheKeys: Set<string>
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
  let stage: NonNullable<ValidationDocumentDiagnostic['stage']> = 'cache'
  let ocrDisposition: PdfOcrDisposition = 'not-needed'

  try {
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

    stage = 'fetch'
    const fileBuffer = await measureValidationPhase(event, 'fetch', () =>
      s3Client.getBuffer(document.sourceBucket, document.sourceKey)
    )
    stage = 'parse'
    const parsed = await parsePdfWithDiagnostics(
      event,
      fileBuffer,
      document.documentName,
      args.shouldAttemptOcrFallback
    )
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

    if (index >= Math.floor(documents.length / 2)) {
      priorityScore += 2
      reasons.push('Later upload order may indicate newer controlling documents.')
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
