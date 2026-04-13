import pdfParse from 'pdf-parse'
import type { PdfParseResult, PdfTextExtractor } from './types'

export class PdfParseTextExtractor implements PdfTextExtractor {
  async extract (
    fileBuffer: Buffer,
    fileName: string
  ): Promise<PdfParseResult> {
    const result = await pdfParse(fileBuffer)

    return {
      fileName,
      // Keep downstream chunking deterministic by trimming parser noise before
      // chunking, embedding, and retrieval consume the text.
      rawText: result.text.trim(),
      pageCount: result.numpages,
      extractionMethod: 'pdf-text',
      extractionNotes: []
    }
  }
}
