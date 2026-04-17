import { pdf } from 'pdf-to-img'
import { createWorker } from 'tesseract.js'
import type { PdfParseResult, PdfTextExtractor } from './types'

export class LocalOcrPdfExtractor implements PdfTextExtractor {
  async extract (
    fileBuffer: Buffer,
    fileName: string
  ): Promise<PdfParseResult> {
    const worker = await createWorker('eng')
    const pageTexts: string[] = []
    let pageCount = 0

    try {
      // Render each PDF page into an image buffer for OCR. This stays isolated
      // to the parsing layer so a future AWS-backed extractor can replace it
      // without changing chunking, embeddings, retrieval, or prompt code.
      const document = await pdf(fileBuffer, { scale: 2 })

      for await (const imageBytes of document) {
        pageCount += 1

        // OCR text is noisier than a native PDF text layer, but it is still
        // more useful than missing key labels and values entirely.
        const result = await worker.recognize(imageBytes)
        pageTexts.push(result.data.text.trim())
      }
    } finally {
      await worker.terminate()
    }

    return {
      fileName,
      rawText: pageTexts.join('\n\n').trim(),
      pageTexts,
      pageCount,
      extractionMethod: 'ocr',
      extractionNotes: ['Used local OCR fallback because default PDF text extraction looked weak']
    }
  }
}
