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
  parseValidationResponse,
  runDeterministicDateValidation
} from '../validation-output'
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
          const llmResult = parseSingleFieldValidationResponse(
            validationResponse.rawText,
            field.field
          )

          return reconcileValidationResults(
            [{ ...llmResult, decisionSource: 'llm' }],
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

function buildFieldRetrievalQuery(field: DateValidationFieldInput['field']): string {
  switch (field) {
    case 'contractStartDate':
      return 'contract start date term begins effective date'
    case 'contractEndDate':
      return 'contract end date through end date term ends expiration date'
    case 'amendmentEffectiveDate':
      return 'amendment effective date'
  }
}

function parseSingleFieldValidationResponse(
  rawText: string,
  expectedField: DateValidationFieldInput['field']
): DateValidationResult {
  const parsedValidation = parseValidationResponse(rawText)

  if (parsedValidation.results.length !== 1) {
    throw new Error(
      `Validation model returned ${parsedValidation.results.length} results for ${expectedField}`
    )
  }

  const [result] = parsedValidation.results

  if (result.field !== expectedField) {
    throw new Error(
      `Validation model returned result for ${result.field} while validating ${expectedField}`
    )
  }

  return result
}
