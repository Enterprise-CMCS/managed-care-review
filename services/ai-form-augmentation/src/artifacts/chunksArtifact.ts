import type { DocumentChunk } from '../chunking'
import type { IndexedDocumentSummary } from './documentIndexArtifact'

export interface ChunksArtifact {
  artifactVersion: string
  generatedAt: string
  documents?: IndexedDocumentSummary[]
  chunks: DocumentChunk[]
}

export function buildChunksArtifact (
  artifactVersion: string,
  chunks: DocumentChunk[],
  documents: IndexedDocumentSummary[] = []
): ChunksArtifact {
  return {
    artifactVersion,
    // Persist the generation time with the artifact so later pipeline steps can
    // inspect when the chunk snapshot was created.
    generatedAt: new Date().toISOString(),
    // Store the current document set alongside the combined chunk snapshot so
    // later runs can cheaply classify unchanged versus added/removed files.
    ...(documents.length > 0 ? { documents } : {}),
    chunks
  }
}

export function getChunksArtifactKey(formId: string): string {
  // Keep formId at the artifact layer so the chunker itself stays focused on
  // text transformation rather than pipeline context.
  return `rag-indexes/${formId}/chunks.json`
}
