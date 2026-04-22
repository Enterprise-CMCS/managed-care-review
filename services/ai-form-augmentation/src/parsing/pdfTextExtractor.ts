import pdfParse from 'pdf-parse'
import type { PdfParseResult, PdfTextExtractor } from './types'

export class PdfParseTextExtractor implements PdfTextExtractor {
  async extract (
    fileBuffer: Buffer,
    fileName: string
  ): Promise<PdfParseResult> {
    const pageTexts: string[] = []
    const result = await pdfParse(fileBuffer, {
      pagerender: async (pageData) => {
        const textContent = await pageData.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: false
        })

        let lastY: number | undefined
        let pageText = ''

        for (const item of textContent.items) {
          if (!('str' in item) || typeof item.str !== 'string') {
            continue
          }

          if (lastY == null || lastY === item.transform[5]) {
            pageText += item.str
          } else {
            pageText += `\n${item.str}`
          }

          lastY = item.transform[5]
        }

        const normalizedPageText = pageText.trim()
        pageTexts.push(normalizedPageText)

        return normalizedPageText
      }
    })

    return {
      fileName,
      // Keep downstream chunking deterministic by trimming parser noise before
      // chunking, embedding, and retrieval consume the text.
      rawText: pageTexts.join('\n\n').trim() || result.text.trim(),
      pageTexts,
      pageCount: result.numpages,
      extractionMethod: 'pdf-text',
      extractionNotes: [],
      ocrDisposition: 'not-needed'
    }
  }
}
