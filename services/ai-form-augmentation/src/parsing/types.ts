export type PdfExtractionMethod = 'pdf-text' | 'ocr'

export interface PdfParseResult {
  fileName: string
  rawText: string
  pageCount: number
  extractionMethod: PdfExtractionMethod
  extractionNotes: string[]
}

export interface PdfTextExtractor {
  extract(fileBuffer: Buffer, fileName: string): Promise<PdfParseResult>
}