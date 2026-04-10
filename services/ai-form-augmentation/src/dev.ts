import { readFile } from 'node:fs/promises'
import { parsePdf } from './parsing'

async function main(): Promise<void> {
  const filePath = '../fixtures/pdf/medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf'
  const buffer = await readFile(new URL(filePath, import.meta.url))
  const parsed = await parsePdf(
    buffer,
    'medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf'
  )

  console.log({
    fileName: parsed.fileName,
    pageCount: parsed.pageCount,
    preview: parsed.rawText.slice(0, 200)
  })
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
