import { createHash } from 'node:crypto'
import type { DocumentChunk } from '../chunking'

export interface IndexedDocumentSummary {
  documentName: string
  sourceBucket: string
  sourceKey: string
  cacheKey: string
  chunkCount: number
}

export interface IndexedDocumentArtifact {
  document: IndexedDocumentSummary
  embeddingModel: string
  chunks: DocumentChunk[]
  chunkVectors: number[][]
}

export function computeDocumentCacheKey(document: {
  documentName: string
  sourceBucket: string
  sourceKey: string
}): string {
  // Reuse stays aligned to the current artifactVersion contract by keying off
  // the same document identity inputs the worker already receives.
  return createHash('sha256')
    .update(
      JSON.stringify({
        documentName: document.documentName,
        sourceBucket: document.sourceBucket,
        sourceKey: document.sourceKey
      })
    )
    .digest('hex')
}

export function summarizeIndexedDocument(input: {
  documentName: string
  sourceBucket: string
  sourceKey: string
  cacheKey?: string
  chunkCount: number
}): IndexedDocumentSummary {
  return {
    documentName: input.documentName,
    sourceBucket: input.sourceBucket,
    sourceKey: input.sourceKey,
    cacheKey:
      input.cacheKey ??
      computeDocumentCacheKey({
        documentName: input.documentName,
        sourceBucket: input.sourceBucket,
        sourceKey: input.sourceKey
      }),
    chunkCount: input.chunkCount
  }
}

export function buildIndexedDocumentArtifact(input: {
  documentName: string
  sourceBucket: string
  sourceKey: string
  chunks: DocumentChunk[]
  chunkVectors: number[][]
  embeddingModel: string
}): IndexedDocumentArtifact {
  return {
    document: summarizeIndexedDocument({
      documentName: input.documentName,
      sourceBucket: input.sourceBucket,
      sourceKey: input.sourceKey,
      chunkCount: input.chunks.length
    }),
    embeddingModel: input.embeddingModel,
    chunks: input.chunks,
    chunkVectors: input.chunkVectors
  }
}

export function getDocumentIndexArtifactKey(
  formId: string,
  cacheKey: string
): string {
  return `rag-indexes/${formId}/documents/${cacheKey}.json`
}

export function classifyDocumentSetChanges(
  previousDocuments: IndexedDocumentSummary[],
  currentDocuments: Array<{
    documentName: string
    sourceBucket: string
    sourceKey: string
  }>
): {
  unchanged: IndexedDocumentSummary[]
  added: Array<{
    documentName: string
    sourceBucket: string
    sourceKey: string
    cacheKey: string
  }>
  removed: IndexedDocumentSummary[]
} {
  const previousByCacheKey = new Map(
    previousDocuments.map((document) => [document.cacheKey, document])
  )
  const currentWithCacheKeys = currentDocuments.map((document) => ({
    ...document,
    cacheKey: computeDocumentCacheKey(document)
  }))
  const currentCacheKeys = new Set(
    currentWithCacheKeys.map((document) => document.cacheKey)
  )

  return {
    unchanged: currentWithCacheKeys.flatMap((document) => {
      const previousDocument = previousByCacheKey.get(document.cacheKey)
      return previousDocument ? [previousDocument] : []
    }),
    added: currentWithCacheKeys.filter(
      (document) => !previousByCacheKey.has(document.cacheKey)
    ),
    removed: previousDocuments.filter(
      (document) => !currentCacheKeys.has(document.cacheKey)
    )
  }
}
