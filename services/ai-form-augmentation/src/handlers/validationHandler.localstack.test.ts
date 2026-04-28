import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import {
  buildChunksArtifact,
  buildIndexedDocumentArtifact,
  computeDocumentCacheKey,
  getChunksArtifactKey,
  getDocumentIndexArtifactKey
} from '../artifacts'
import { XenovaEmbeddingProvider } from '../embeddings'
import {
  ensureEvaluationStorageReady,
  getEvaluationStorageConfig
} from '../evaluation/evaluationStorage'
import { validationHandler, type ValidationSourceDocument } from './validationHandler'
import { buildValidationResultArtifact, getValidationResultKey } from '../results'
import { newArtifactS3Client } from '../s3'
import {
  buildCompletedValidationStatusArtifact,
  getValidationStatusKey
} from '../status'
import {
  computeArtifactVersion,
  computeFormSnapshotHash
} from '../versioning'

const FIXTURE_PDF_PATH = new URL(
  '../../fixtures/pdf/scan-07-65712-a26-213a-final.pdf',
  import.meta.url
)
const TEST_EMBEDDING_MODEL = 'localstack-test-model'

const originalEmbedText = XenovaEmbeddingProvider.prototype.embedText
const originalEmbedTexts = XenovaEmbeddingProvider.prototype.embedTexts
const originalGetModelInfo = XenovaEmbeddingProvider.prototype.getModelInfo

XenovaEmbeddingProvider.prototype.getModelInfo = function getModelInfo(): string {
  return TEST_EMBEDDING_MODEL
}

XenovaEmbeddingProvider.prototype.embedText = async function embedText(
  text: string
): Promise<number[]> {
  return buildTestVector(text)
}

XenovaEmbeddingProvider.prototype.embedTexts = async function embedTexts(
  texts: string[]
): Promise<number[][]> {
  return texts.map((text) => buildTestVector(text))
}

process.on('exit', () => {
  XenovaEmbeddingProvider.prototype.embedText = originalEmbedText
  XenovaEmbeddingProvider.prototype.embedTexts = originalEmbedTexts
  XenovaEmbeddingProvider.prototype.getModelInfo = originalGetModelInfo
})

type LocalStackHarnessContext = {
  bucket: string
  s3Client: ReturnType<typeof newArtifactS3Client>
}

const fixturePdfBufferPromise = readFile(FIXTURE_PDF_PATH)

function buildContractFields(startDate: string, endDate: string) {
  return [
    {
      field: 'contractStartDate' as const,
      label: 'Contract Start Date',
      value: startDate
    },
    {
      field: 'contractEndDate' as const,
      label: 'Contract End Date',
      value: endDate
    }
  ]
}

function buildFormSnapshotHashForFields(
  fields: ReturnType<typeof buildContractFields>
): string {
  return computeFormSnapshotHash(
    fields.map((field) => ({
      field: field.field,
      value: field.value
    }))
  )
}

function buildTestVector(text: string): number[] {
  const normalized = text.toLowerCase()
  const uppercaseCount = [...text].filter((character) =>
    character >= 'A' && character <= 'Z'
  ).length

  return [
    normalized.includes('start date') ? 5 : 1,
    normalized.includes('end date') ? 5 : 1,
    normalized.includes('amendment') ? 3 : 1,
    (text.length % 11) + 1,
    uppercaseCount + 1
  ]
}

function buildDocumentChunk(documentName: string) {
  const text = [
    'STANDARD AGREEMENT AMENDMENT',
    'START DATE January 1, 2024',
    'THROUGH END DATE December 31, 2025',
    'Paragraph 2 is amended to read January 1, 2024 through December 31, 2025.'
  ].join('\n')

  return {
    chunkId: `${documentName}::chunk-0`,
    documentName,
    order: 0,
    page: 1,
    startPage: 1,
    endPage: 1,
    text,
    startChar: 0,
    endChar: text.length
  }
}

async function seedCurrentDocuments(
  context: LocalStackHarnessContext,
  documents: ValidationSourceDocument[]
): Promise<void> {
  const buffer = await fixturePdfBufferPromise

  await Promise.all(
    documents.map((document) =>
      context.s3Client.putBuffer(
        context.bucket,
        document.sourceKey,
        buffer,
        'application/pdf'
      )
    )
  )
}

async function seedIndexedDocumentArtifacts(args: {
  context: LocalStackHarnessContext
  formId: string
  artifactVersion: string
  documents: ValidationSourceDocument[]
}): Promise<void> {
  const indexedArtifacts = args.documents.map((document) => {
    const chunk = buildDocumentChunk(document.documentName)

    return buildIndexedDocumentArtifact({
      documentName: document.documentName,
      sourceBucket: document.sourceBucket,
      sourceKey: document.sourceKey,
      chunks: [chunk],
      chunkVectors: [buildTestVector(chunk.text)],
      embeddingModel: TEST_EMBEDDING_MODEL
    })
  })

  await Promise.all([
    args.context.s3Client.putJson(
      args.context.bucket,
      getChunksArtifactKey(args.formId),
      buildChunksArtifact(
        args.artifactVersion,
        indexedArtifacts.flatMap((artifact) => artifact.chunks),
        indexedArtifacts.map((artifact) => artifact.document)
      )
    ),
    ...indexedArtifacts.map((artifact) =>
      args.context.s3Client.putJson(
        args.context.bucket,
        getDocumentIndexArtifactKey(args.formId, artifact.document.cacheKey),
        artifact
      )
    )
  ])
}

async function withLocalStackHarness(
  name: string,
  run: (context: LocalStackHarnessContext) => Promise<void>
) {
  await test(name, async (t) => {
    const evaluationStorage = getEvaluationStorageConfig()

    try {
      await ensureEvaluationStorageReady(evaluationStorage)
    } catch (error) {
      t.skip(error instanceof Error ? error.message : String(error))
      return
    }

    await run({
      bucket: evaluationStorage.bucket,
      s3Client: newArtifactS3Client(evaluationStorage.s3Config)
    })
  })
}

await withLocalStackHarness(
  'localstack replay reuses cached indexed documents and prior OCR-capped skips on form-only reruns',
  async (context) => {
    const formId = `localstack-rerun-${randomUUID()}`
    const goodDocument = {
      documentName: 'contract-a.pdf',
      sourceBucket: context.bucket,
      sourceKey: `localstack/${formId}/contract-a.pdf`
    }
    const cappedDocument = {
      documentName: 'slow-scan.pdf',
      sourceBucket: context.bucket,
      sourceKey: `localstack/${formId}/slow-scan.pdf`
    }
    const documents = [goodDocument, cappedDocument]
    const artifactVersion = computeArtifactVersion(
      documents.map((document) => document.sourceKey)
    )
    const previousFields = buildContractFields('01/01/2023', '12/31/2024')
    const currentFields = buildContractFields('01/01/2024', '12/31/2025')

    await seedCurrentDocuments(context, documents)
    await seedIndexedDocumentArtifacts({
      context,
      formId,
      artifactVersion,
      documents: [goodDocument]
    })

    const previousDocumentDiagnostics = [
      {
        documentName: goodDocument.documentName,
        sourceBucket: goodDocument.sourceBucket,
        sourceKey: goodDocument.sourceKey,
        status: 'processed' as const,
        usable: true,
        chunkCount: 1,
        stage: 'cache' as const
      },
      {
        documentName: cappedDocument.documentName,
        sourceBucket: cappedDocument.sourceBucket,
        sourceKey: cappedDocument.sourceKey,
        status: 'skipped' as const,
        usable: false,
        chunkCount: 0,
        ocrDisposition: 'skipped' as const,
        stage: 'cache' as const,
        reason: 'ocr-capped-large-batch'
      }
    ]

    await context.s3Client.putJson(
      context.bucket,
      getValidationStatusKey(formId),
      buildCompletedValidationStatusArtifact(
        artifactVersion,
        previousDocumentDiagnostics
      )
    )
    await context.s3Client.putJson(
      context.bucket,
      getValidationResultKey(formId),
      buildValidationResultArtifact(
        artifactVersion,
        buildFormSnapshotHashForFields(previousFields),
        [],
        [],
        [],
        previousDocumentDiagnostics
      )
    )

    await validationHandler({
      formId,
      artifactVersion,
      bucket: context.bucket,
      formFields: currentFields,
      documents,
      s3Config: getEvaluationStorageConfig().s3Config
    })

    const storedResult = await context.s3Client.getJson<{
      results: Array<{ field: string }>
      documentDiagnostics: Array<{
        documentName: string
        stage?: string
        reason?: string
      }>
    }>(context.bucket, getValidationResultKey(formId))

    assert.equal(storedResult.results.length, 2)
    assert.deepEqual(
      storedResult.documentDiagnostics.map((diagnostic) => ({
        documentName: diagnostic.documentName,
        stage: diagnostic.stage,
        reason: diagnostic.reason
      })),
      [
        {
          documentName: goodDocument.documentName,
          stage: 'cache',
          reason: undefined
        },
        {
          documentName: cappedDocument.documentName,
          stage: 'cache',
          reason: 'ocr-capped-large-batch'
        }
      ]
    )
  }
)

await withLocalStackHarness(
  'localstack replay keeps all-doc and gated completed results separate',
  async (context) => {
    const formId = `localstack-mode-${randomUUID()}`
    const document = {
      documentName: 'contract-a.pdf',
      sourceBucket: context.bucket,
      sourceKey: `localstack/${formId}/contract-a.pdf`
    }
    const artifactVersion = computeArtifactVersion([document.sourceKey])
    const formFields = buildContractFields('01/01/2024', '12/31/2025')
    const formSnapshotHash = buildFormSnapshotHashForFields(formFields)

    await seedCurrentDocuments(context, [document])
    await seedIndexedDocumentArtifacts({
      context,
      formId,
      artifactVersion,
      documents: [document]
    })
    await context.s3Client.putJson(
      context.bucket,
      getValidationStatusKey(formId),
      buildCompletedValidationStatusArtifact(
        artifactVersion,
        [],
        'gated-first-pass'
      )
    )
    await context.s3Client.putJson(
      context.bucket,
      getValidationResultKey(formId),
      buildValidationResultArtifact(
        artifactVersion,
        formSnapshotHash,
        [],
        [],
        [],
        [],
        'gated-first-pass'
      )
    )

    await validationHandler({
      formId,
      artifactVersion,
      bucket: context.bucket,
      formFields,
      documents: [document],
      workSelectionMode: 'all-doc',
      s3Config: getEvaluationStorageConfig().s3Config
    })

    const storedResult = await context.s3Client.getJson<{
      results: Array<{ field: string }>
      workSelectionMode?: string
    }>(context.bucket, getValidationResultKey(formId))
    const storedStatus = await context.s3Client.getJson<{
      stage: string
      workSelectionMode?: string
    }>(context.bucket, getValidationStatusKey(formId))

    assert.equal(storedResult.results.length, 2)
    assert.equal(storedResult.workSelectionMode, undefined)
    assert.equal(storedStatus.stage, 'complete')
    assert.equal(storedStatus.workSelectionMode, undefined)
  }
)

await withLocalStackHarness(
  'localstack replay does not reuse completed results when artifact identity changes',
  async (context) => {
    const formId = `localstack-artifact-${randomUUID()}`
    const document = {
      documentName: 'contract-a.pdf',
      sourceBucket: context.bucket,
      sourceKey: `localstack/${formId}/contract-a.pdf`
    }
    const previousArtifactVersion = 'artifact-v1'
    const currentArtifactVersion = 'artifact-v2'
    const formFields = buildContractFields('01/01/2024', '12/31/2025')
    const formSnapshotHash = buildFormSnapshotHashForFields(formFields)

    await seedCurrentDocuments(context, [document])
    await seedIndexedDocumentArtifacts({
      context,
      formId,
      artifactVersion: previousArtifactVersion,
      documents: [document]
    })
    await context.s3Client.putJson(
      context.bucket,
      getValidationStatusKey(formId),
      buildCompletedValidationStatusArtifact(previousArtifactVersion)
    )
    await context.s3Client.putJson(
      context.bucket,
      getValidationResultKey(formId),
      buildValidationResultArtifact(
        previousArtifactVersion,
        formSnapshotHash,
        []
      )
    )

    await validationHandler({
      formId,
      artifactVersion: currentArtifactVersion,
      bucket: context.bucket,
      formFields,
      documents: [document],
      workSelectionMode: 'all-doc',
      s3Config: getEvaluationStorageConfig().s3Config
    })

    const storedResult = await context.s3Client.getJson<{
      artifactVersion: string
      results: Array<{ field: string }>
    }>(context.bucket, getValidationResultKey(formId))

    assert.equal(storedResult.artifactVersion, currentArtifactVersion)
    assert.equal(storedResult.results.length, 2)
  }
)
