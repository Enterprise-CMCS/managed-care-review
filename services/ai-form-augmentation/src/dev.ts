import { readFile } from 'node:fs/promises'
import { buildChunksArtifact, getChunksArtifactKey } from './artifacts'
import { chunkDocument } from './chunking'
import { parsePdf } from './parsing'
import { newArtifactS3Client } from './s3'

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

  console.log({
    bucket,
    key,
    artifactVersion: storedArtifact.artifactVersion,
    chunkCount: storedArtifact.chunks.length,
    firstChunk: storedArtifact.chunks[0]
      ? {
        chunkId: storedArtifact.chunks[0].chunkId,
        order: storedArtifact.chunks[0].order,
        preview: storedArtifact.chunks[0].text.slice(0,200)
      }
      : null
  })
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
