export type PdfExtractionMethod = 'pdf-text' | 'ocr'
export type PdfOcrDisposition = 'not-needed' | 'attempted' | 'skipped'

export interface PdfParseResult {
  fileName: string
  rawText: string
  pageTexts: string[]
  pageCount: number
  extractionMethod: PdfExtractionMethod
  extractionNotes: string[]
  ocrDisposition: PdfOcrDisposition
}

export interface PdfTextExtractor {
  extract(fileBuffer: Buffer, fileName: string): Promise<PdfParseResult>
}

export interface ParsePdfOptions {
  shouldAttemptOcrFallback?: (result: PdfParseResult) => boolean
}
