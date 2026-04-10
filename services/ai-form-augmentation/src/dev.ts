import { readFile } from 'node:fs/promises'
import { chunkDocument } from './chunking'
import { parsePdf } from './parsing'

async function main(): Promise<void> {
  const filePath = '../fixtures/pdf/medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf'
  const buffer = await readFile(new URL(filePath, import.meta.url))
  const parsed = await parsePdf(
    buffer,
    'medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf'
  )

  // Use the parsed PDF text as-is so chunking can be inspected independently of S3 or embeddings.
  const chunks = chunkDocument(parsed.fileName, parsed.rawText)

  console.log({
    fileName: parsed.fileName,
    pageCount: parsed.pageCount,
    chunkCount: chunks.length,
    firstChunk: chunks[0]
      ? {
        chunkId: chunks[0].chunkId,
        order: chunks[0].order,
        startChar: chunks[0].startChar,
        endChar: chunks[0].endChar,
        preview: chunks[0].text.slice(0, 200)
      }
      : null
  })
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
