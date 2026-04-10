import type { DocumentChunk } from "../chunking";

export interface ChunksArtifact {
  artifactVersion: string
  generatedAt: string
  chunks: DocumentChunk[]
}

export function buildChunksArtifact (
  artifactVersion: string,
  chunks: DocumentChunk[]
): ChunksArtifact {
  return {
    artifactVersion,
    // Persist the generation time with the artifact so later pipeline steps can
    // inspect when the chunk snapshot was created.
    generatedAt: new Date().toISOString(),
    chunks
  }
}

export function getChunksArtifactKey(formId: string): string {
  // Keep formId at the artifact layer so the chunker itself stays focused on
  // text transformation rather than pipeline context.
  return `rag-indexes/${formId}/chunks.json`
}
