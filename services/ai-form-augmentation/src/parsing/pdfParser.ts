import pdfParse from 'pdf-parse'

export interface PdfParseResult {
  fileName: string
  rawText: string
  pageCount: number
}

export async function parsePdf (
  fileBuffer: Buffer,
  fileName: string
): Promise<PdfParseResult> {
  const result = await pdfParse(fileBuffer)

  return {
    fileName,
    // Trim leading and trailing parser noise so downstream chunking starts from
    // a stable text shape.
    rawText: result.text.trim(),
    pageCount: result.numpages
  }
}
