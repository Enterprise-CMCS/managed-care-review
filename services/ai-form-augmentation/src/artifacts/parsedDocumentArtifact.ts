import type { PdfExtractionMethod, PdfOcrDisposition } from '../parsing'
import {
  computeDocumentCacheKey,
  summarizeIndexedDocument,
  type IndexedDocumentSummary
} from './documentIndexArtifact'

export interface ParsedDocumentArtifact {
  generatedAt: string
  document: IndexedDocumentSummary
  pageCount: number
  rawText: string
  pageTexts: string[]
  extractionMethod: PdfExtractionMethod
  extractionNotes: string[]
  ocrDisposition: PdfOcrDisposition
}

export function buildParsedDocumentArtifact(input: {
  documentName: string
  sourceBucket: string
  sourceKey: string
  pageCount: number
  rawText: string
  pageTexts: string[]
  extractionMethod: PdfExtractionMethod
  extractionNotes: string[]
  ocrDisposition: PdfOcrDisposition
}): ParsedDocumentArtifact {
  return {
    generatedAt: new Date().toISOString(),
    document: summarizeIndexedDocument({
      documentName: input.documentName,
      sourceBucket: input.sourceBucket,
      sourceKey: input.sourceKey,
      chunkCount: 0
    }),
    pageCount: input.pageCount,
    rawText: input.rawText,
    pageTexts: input.pageTexts,
    extractionMethod: input.extractionMethod,
    extractionNotes: input.extractionNotes,
    ocrDisposition: input.ocrDisposition
  }
}

export function getParsedDocumentArtifactKey(
  formId: string,
  cacheKey: string
): string {
  return `rag-indexes/${formId}/parsed-documents/${cacheKey}.json`
}

export function getParsedDocumentArtifactKeyForDocument(
  formId: string,
  document: {
    documentName: string
    sourceBucket: string
    sourceKey: string
  }
): string {
  return getParsedDocumentArtifactKey(formId, computeDocumentCacheKey(document))
}
