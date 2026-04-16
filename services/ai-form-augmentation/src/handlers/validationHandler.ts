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
import { parseValidationResponse } from '../validation-output'
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
      chunkDocument(parsed.fileName, parsed.rawText)
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

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildValidationStatusArtifact('embedding', event.artifactVersion)
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
      buildValidationStatusArtifact('indexing', event.artifactVersion)
    )

    // Build the in-memory retrieval index from the current chunk artifact. This
    // keeps the PoC simple while still exercising the same search contract a
    // production vector backend would eventually replace.
    const vectorStore = new BruteForceVectorStore<{
      chunkId: string
      documentName: string
      order: number
      page: number | null
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
          text: chunk.text
        }
      }))
    )

    // The first PoC retrieval query stays intentionally narrow and date-focused.
    // It is not trying to solve general semantic search yet; it only needs to
    // bring back the chunks most likely to support date validation.
    const queryText =
      'contract term start date end date amendment effective date'
    const queryVector = await embeddingProvider.embedText(queryText)
    const orderedResults = orderRetrievedChunks(
      await vectorStore.search(queryVector, 3)
    )

    await s3Client.putJson(
      event.bucket,
      statusKey,
      buildValidationStatusArtifact('validating', event.artifactVersion)
    )

    // Convert retrieved evidence plus current form values into the exact prompt
    // contract the validation model expects. At this point the worker has moved
    // from document processing into model-facing comparison logic.
    const prompt = buildDateValidationPrompt({
      formFields: event.formFields,
      retrievedChunks: orderedResults.map((result) => ({
        chunkId: result.metadata.chunkId,
        documentName: result.metadata.documentName,
        page: result.metadata.page,
        order: result.metadata.order,
        text: result.metadata.text
      }))
    })

    const validationClient = new OllamaValidationClient()
    const validationResponse = await validationClient.generateValidation({
      prompt
    })
    // Parse and validate the raw LLM response immediately so malformed model
    // output fails the pipeline here instead of leaking partial artifacts to the UI.
    const parsedValidation = parseValidationResponse(
      validationResponse.rawText
    )

    // Reconcile LLM-returned citations against known chunks before persisting
    // them so downstream UI never trusts model-invented page/order metadata.
    const reconciledResults = reconcileValidationResults(
      parsedValidation.results,
      chunks
    )

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
        reconciledResults
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
        page: chunk.page
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
          order: knownChunk.order
        }
      ]
    })
  }))
}
