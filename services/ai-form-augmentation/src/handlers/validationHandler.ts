import {
  buildChunksArtifact,
  getChunksArtifactKey
} from '../artifacts'
import { chunkDocument } from '../chunking'
import { XenovaEmbeddingProvider } from '../embeddings'
import { OllamaValidationClient } from '../llm'
import { parsePdf } from '../parsing'
import type {
  DateValidationFieldInput,
  DateValidationResult
} from '../prompts'
import { buildDateValidationPrompt } from '../prompts'
import { orderRetrievedChunks } from '../retrieval'
import {
  buildValidationResultArtifact,
  getValidationResultKey
} from '../results'
import { newArtifactS3Client } from '../s3'
import type { ArtifactS3ClientConfig } from '../s3'
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
  type ValidationResponseIssue
} from '../validation-output'
import { VALIDATION_FIELD_CONFIG } from '../validationFields'
import { BruteForceVectorStore } from '../vector-store'
import { computeFormSnapshotHash } from '../versioning'

export interface ValidationSourceDocument {
  documentName: string
  sourceBucket: string
  sourceKey: string
}

export interface ValidationHandlerEvent {
  formId: string
  artifactVersion: string
  bucket: string
  s3Config: ArtifactS3ClientConfig
  formFields: DateValidationFieldInput[]
  documents: ValidationSourceDocument[]
}

export interface ValidationHandlerResult {
  formId: string
  artifactVersion: string
  status: 'completed'
}

export async function validationHandler(
  event: ValidationHandlerEvent
): Promise<ValidationHandlerResult> {
  const s3Client = newArtifactS3Client(event.s3Config)
  // status.json is the coordination point the frontend polls, so every major
  // worker phase updates the same key rather than scattering progress across
  // multiple artifacts.
  const statusKey = getValidationStatusKey(event.formId)

  try {
    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildValidationStatusArtifact('parsing', event.artifactVersion)
    )

    // Parse each source document inside the worker so the app flow no longer
    // depends on a separate manual script to create chunks or prompt context.
    const parsedDocuments = await Promise.all(
      event.documents.map(async (document) => {
        const fileBuffer = await s3Client.getBuffer(
          document.sourceBucket,
          document.sourceKey
        )
        const parsed = await parsePdf(fileBuffer, document.documentName)

        return {
          document,
          parsed
        }
      })
    )

    // Flatten parsed documents into one chunk set for this form so retrieval
    // can search across all currently attached contract PDFs as one evidence pool.
    const chunks = parsedDocuments.flatMap(({ parsed }) =>
      chunkDocument(parsed.fileName, parsed.rawText, {
        pageTexts: parsed.pageTexts
      })
    )

    if (chunks.length === 0) {
      throw new Error(
        `Validation could not create chunks for form ${event.formId}`
      )
    }

    await s3Client.putJson(
      event.bucket,
      getChunksArtifactKey(event.formId),
      buildChunksArtifact(event.artifactVersion, chunks)
    )

    // Re-embed the stored chunk text inside the worker so the runtime path does
    // not depend on a separate manual precomputation step from src/dev.ts.
    const embeddingProvider = new XenovaEmbeddingProvider()
    const chunkVectors = await embeddingProvider.embedTexts(
      chunks.map((chunk) => chunk.text)
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

    const retrievedChunksByField = new Map(
      await Promise.all(
        event.formFields.map(async (field) => {
          const queryVector = await embeddingProvider.embedText(
            buildFieldRetrievalQuery(field.field)
          )
          const orderedResults = orderRetrievedChunks(
            await vectorStore.search(queryVector, 3)
          )

          return [
            field.field,
            orderedResults.map((result) => ({
              chunkId: result.metadata.chunkId,
              documentName: result.metadata.documentName,
              page: result.metadata.page,
              startPage: result.metadata.startPage,
              endPage: result.metadata.endPage,
              order: result.metadata.order,
              text: result.metadata.text
            }))
          ] as const
        })
      )
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

    for (const field of event.formFields) {
      const retrievedChunksForField =
        retrievedChunksByField.get(field.field) ?? []
      const deterministicValidation = runDeterministicDateValidation({
        formFields: [field],
        retrievedChunks: retrievedChunksForField
      })

      deterministicResults.push(...deterministicValidation.resolvedResults)

      if (deterministicValidation.unresolvedFields.length > 0) {
        unresolvedFields.push({
          field,
          retrievedChunks: retrievedChunksForField
        })
      }
    }

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

      const validationClient = new OllamaValidationClient()
      const llmResults = await Promise.all(
        unresolvedFields.map(async ({ field, retrievedChunks }) => {
          // Convert only the unresolved field plus its own retrieved evidence
          // into the prompt so start and end dates do not share mixed context.
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
            result: { ...parsedLlmResponse.result, decisionSource: 'llm' },
            retrievedChunks
          })

          return reconcileValidationResults(
            [normalizedResult],
            retrievedChunks
          )
        })
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
        computeFormSnapshotHash(
          event.formFields.map((field) => ({
            field: field.field,
            value: field.value
          }))
        ),
        reconciledResults,
        llmDiagnostics
      )
    )

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildCompletedValidationStatusArtifact(event.artifactVersion)
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
      buildFailedValidationStatusArtifact(event.artifactVersion, message)
    )

    throw error
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
    chunkIds: [...new Set(citationsMissingPage.map((citation) => citation.chunkId))]
  })
}

function buildFieldRetrievalQuery(field: DateValidationFieldInput['field']): string {
  return VALIDATION_FIELD_CONFIG[field].retrievalQuery
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
