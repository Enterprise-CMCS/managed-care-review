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
    rawText: result.text.trim(),
    pageCount: result.numpages
  }
}