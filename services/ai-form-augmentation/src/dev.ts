import { readFile } from 'node:fs/promises'
import { buildChunksArtifact, getChunksArtifactKey } from './artifacts'
import { chunkDocument } from './chunking'
import { XenovaEmbeddingProvider } from './embeddings'
import { parsePdf } from './parsing'
import { orderRetrievedChunks } from './retrieval'
import { newArtifactS3Client } from './s3'
import { BruteForceVectorStore } from './vector-store'
import { buildDateValidationPrompt } from './prompts'
import { OllamaValidationClient } from './llm'
import { parseValidationResponse } from './validation-output'
import { validationHandler } from './handlers'
import { getValidationStatusKey } from './status'
import {
  buildValidationResultArtifact,
  getValidationResultKey
} from './results'
import {
  computeArtifactVersion,
  computeFormSnapshotHash
} from './versioning'

async function main(): Promise<void> {
  // These values model the runtime context that later pipeline steps will
  // supply when writing artifacts for a real submission.
  const formId = 'local-dev-form'
  const bucket = 'ai-form-augmentation-artifacts'
  const sourceKey = 'fixtures/pdf/scan-07-65712-a26-213a-final.pdf'
  const documentKeys = [sourceKey]
  const artifactVersion = computeArtifactVersion(documentKeys)
  const filePath = '../fixtures/pdf/scan-07-65712-a26-213a-final.pdf'

  const buffer = await readFile(new URL(filePath, import.meta.url))
  const parsed = await parsePdf(
    buffer,
    'scan-07-65712-a26-213a-final.pdf'
  )
  const normalizedParsedText = parsed.rawText.toUpperCase()

  // Use the parsed PDF text as-is so chunking can be inspected independently of S3 or embeddings.
  const chunks = chunkDocument(parsed.fileName, parsed.rawText)

  const artifact = buildChunksArtifact(artifactVersion, chunks)
  const key = getChunksArtifactKey(formId)

  // LocalStack accepts placeholder credentials in local mode and uses path-style
  // S3 addressing, which matches the existing repo pattern for local S3 access.
  const s3Client = newArtifactS3Client({
    region: 'us-east-1',
    endpoint: 'http://127.0.0.1:4566',
    forcePathStyle: true,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test' //pragma: allowlist secret
    }
  })

  await s3Client.putJson(bucket, key, artifact)
  const storedArtifact = await s3Client.getJson<typeof artifact>(bucket, key)

  // Store the source PDF in S3 as well so the runtime handler can exercise the
  // same document-loading path used by the real app trigger flow.
  await s3Client.putBuffer(bucket, sourceKey, buffer, 'application/pdf')

  const embeddingProvider = new XenovaEmbeddingProvider()
  const chunkTexts = storedArtifact.chunks.map((chunk) => chunk.text)
  const chunkVectors = await embeddingProvider.embedTexts(chunkTexts)

  const vectorStore = new BruteForceVectorStore<{
    chunkId: string
    documentName: string
    order: number
    page: number | null
    text: string
  }>()

  await vectorStore.add(
    storedArtifact.chunks.map((chunk, index) => ({
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

  const queryText = 'contract term start date end date amendment effective date'
  const queryVector = await embeddingProvider.embedText(queryText)
  const similarityResults = await vectorStore.search(queryVector, 3)
  // Preserve the same retrieved chunks, but reorder them into source order so
  // the final prompt context reads more naturally.
  const orderedResults = orderRetrievedChunks(similarityResults)

  const formFields = [
    {
      field: 'contractStartDate',
      label: 'Contract Start Date',
      value: 'January 1, 2008'
    },
    {
      field: 'contractEndDate',
      label: 'Contract End Date',
      value: 'December 31, 2021'
    },
    {
      field: 'amendmentEffectiveDate',
      label: 'Amendment Effective Date',
      value: 'January 1, 2021'
    }
  ] as const

  const prompt = buildDateValidationPrompt({
    formFields: [...formFields],
    retrievedChunks: orderedResults.map((result) => ({
      chunkId: result.metadata.chunkId,
      documentName: result.metadata.documentName,
      page: result.metadata.page,
      order: result.metadata.order,
      text: result.metadata.text
    }))
  })

  // Keep the first model integration simple: send the prompt and inspect raw
  // output before adding JSON normalization or schema validation.
  const llmClient = new OllamaValidationClient({
    model: 'llama3.1:8b'
  })

  const validationResponse = await llmClient.generateValidation({
    prompt
  })

  // This is the first end-to-end proof that raw model output can be converted
  // into typed validation results without manual cleanup in the terminal.
  const parsedValidation = parseValidationResponse(validationResponse.rawText)

  await validationHandler({
    formId,
    artifactVersion,
    bucket,
    formFields: [...formFields],
    documents: [
      {
        documentName: 'scan-07-65712-a26-213a-final.pdf',
        sourceBucket: bucket,
        sourceKey
      }
    ],
    // Keep storage config explicit so the same handler can run against LocalStack
    // in local development and AWS S3 in deployed environments.
    s3Config: {
      region: 'us-east-1',
      endpoint: 'http://127.0.0.1:4566',
      forcePathStyle: true,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test' //pragma: allowlist secret
      }
    }
  })

  const statusArtifact = await s3Client.getJson(bucket, getValidationStatusKey(formId))

  // Hash the normalized form field values so form-only changes can be detected
  // independently from document-set changes.
  const formSnapshotHash = computeFormSnapshotHash(
    formFields.map((field) => ({
      field: field.field,
      value: field.value
    }))
  )

  const validationResultArtifact = buildValidationResultArtifact(
    artifactVersion,
    formSnapshotHash,
    parsedValidation.results
  )

  const validationResultKey = getValidationResultKey(formId)

  await s3Client.putJson(bucket, validationResultKey, validationResultArtifact)

  const storedValidationResult =
    await s3Client.getJson<typeof validationResultArtifact>(
      bucket,
      validationResultKey
    )

  console.log({
    hasStartDateLabel: normalizedParsedText.includes('START DATE'),
    hasJanuary1: parsed.rawText.includes('January 1'),
    hasFebruary182026: parsed.rawText.includes('February 18, 2026'),
    bucket,
    key,
    artifactVersion: storedArtifact.artifactVersion,
    chunkCount: storedArtifact.chunks.length,
    embeddingModel: embeddingProvider.getModelInfo?.(),
    embeddedChunkCount: chunkVectors.length,
    vectorLength: chunkVectors[0]?.length ?? 0,
    queryText,
    topResultsBySimilarity: similarityResults.map((result) => ({
      id: result.id,
      score: result.score,
      order: result.metadata.order,
      preview: result.metadata.text.slice(0, 2000)
    })),
    topResultsOrderedForPrompt: orderedResults.map((result) => ({
      id: result.id,
      score: result.score,
      order: result.metadata.order,
      preview: result.metadata.text.slice(0, 2000)
    })),
    extractionMethod: parsed.extractionMethod,
    extractionNotes: parsed.extractionNotes,
    parsedTextPreview: parsed.rawText.slice(0, 1000),
    promptPreview: prompt.slice(0, 4000),
    llmModel: validationResponse.model,
    llmResponsePreview: validationResponse.rawText.slice(0, 4000),
    parsedValidationCount: parsedValidation.results.length,
    parsedValidationPreview: parsedValidation.results,
    statusArtifact,
    validationResultKey,
    storedValidationResult
  })
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
