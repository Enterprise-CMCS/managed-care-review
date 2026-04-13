import { LocalOcrPdfExtractor } from './localOcrPdfExtractor'
import { PdfParseTextExtractor } from './pdfTextExtractor'
import type { PdfParseResult } from './types'

function shouldFallbackToOcr(result: PdfParseResult): boolean {
  const text = result.rawText.trim()

  // Keep the first heuristic intentionally simple and explainable.
  // We only fall back when the default parser appears to have extracted
  // too little text to be trustworthy for retrieval and prompt validation.
  // This stays document-agnostic on purpose so the parsing layer does not
  // depend on specific business fields like "Start Date".
  return text.length < 500
}

export async function parsePdf (
  fileBuffer: Buffer,
  fileName: string
): Promise<PdfParseResult> {
  const pdfTextExtractor = new PdfParseTextExtractor()
  const pdfTextResult = await pdfTextExtractor.extract(fileBuffer, fileName)

  if (!shouldFallbackToOcr(pdfTextResult)) {
    return pdfTextResult
  }

  // OCR is the fallback path because native PDF text extraction is usually
  // cleaner when a usable text layer already exists in the document.
  const ocrExtractor = new LocalOcrPdfExtractor()
  const ocrResult = await ocrExtractor.extract(fileBuffer, fileName)

  return {
    ...ocrResult,
    extractionNotes: [
      ...pdfTextResult.extractionNotes,
      `Default PDF text extraction looked weak (length=${pdfTextResult.rawText.length})`,
      ...ocrResult.extractionNotes
    ]
  }
}
