import { readFile } from 'node:fs/promises'
import { buildChunksArtifact, getChunksArtifactKey } from './artifacts'
import { chunkDocument } from './chunking'
import { XenovaEmbeddingProvider } from './embeddings'
import { parsePdf } from './parsing'
import { newArtifactS3Client } from './s3'
import { BruteForceVectorStore } from './vector-store'

async function main(): Promise<void> {
  // These values model the runtime context that later pipeline steps will
  // supply when writing artifacts for a real submission.
  const formId = 'local-dev-form'
  const bucket = 'ai-form-augmentation-artifacts'
  const artifactVersion = 'local-dev-v1'
  const filePath = '../fixtures/pdf/medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf'

  const buffer = await readFile(new URL(filePath, import.meta.url))
  const parsed = await parsePdf(
    buffer,
    'medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf'
  )

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

  const embeddingProvider = new XenovaEmbeddingProvider()
  const chunkTexts = storedArtifact.chunks.map((chunk) => chunk.text)
  const chunkVectors = await embeddingProvider.embedTexts(chunkTexts)

  const vectorStore = new BruteForceVectorStore<{
    chunkId: string
    documentName: string
    order: number
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
        text: chunk.text
      }
    }))
  )

  const queryText = 'contract rate certification submission instructions'
  const queryVector = await embeddingProvider.embedText(queryText)
  const results = await vectorStore.search(queryVector, 3)

  console.log({
    bucket,
    key,
    artifactVersion: storedArtifact.artifactVersion,
    chunkCount: storedArtifact.chunks.length,
    embeddingModel: embeddingProvider.getModelInfo?.(),
    embeddedChunkCount: chunkVectors.length,
    vectorLength: chunkVectors[0]?.length ?? 0,
    queryText,
    topResults: results.map((result) => ({
      id: result.id,
      score: result.score,
      order: result.metadata.order,
      preview: result.metadata.text.slice(0, 160)
    }))
  })
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
