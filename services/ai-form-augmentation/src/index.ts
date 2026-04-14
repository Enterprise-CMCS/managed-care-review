// S3
export type { ArtifactS3Client } from './s3'
export { newArtifactS3Client } from './s3'

// PDF parsing
export type {
  PdfExtractionMethod,
  PdfParseResult,
  PdfTextExtractor
} from './parsing'
export {
  LocalOcrPdfExtractor,
  parsePdf,
  PdfParseTextExtractor
} from './parsing'

// Chunking
export type { ChunkDocumentOptions, DocumentChunk } from './chunking'
export { chunkDocument } from './chunking'

// Artifacts
export type { ChunksArtifact } from './artifacts'
export { buildChunksArtifact, getChunksArtifactKey } from './artifacts'

// Embeddings
export type { EmbeddingProvider } from './embeddings'
export { XenovaEmbeddingProvider } from './embeddings'

// Vector store
export type {
  VectorSearchResult,
  VectorStore,
  VectorStoreItem
} from './vector-store'
export { BruteForceVectorStore } from './vector-store'

// Retrieval
export type {
  OrderedChunkMetadata,
  RetrievedChunk
} from './retrieval'
export { orderRetrievedChunks } from './retrieval'

// Prompts
export type {
  BuildDateValidationPromptInput,
  DateValidationCitationInput,
  DateValidationFieldInput,
  DateValidationResult
} from './prompts'
export { buildDateValidationPrompt } from './prompts'

// LLM
export type {
  GenerateValidationInput,
  GenerateValidationResult,
  ValidationLlmClient
} from './llm'
export { OllamaValidationClient } from './llm'

// Validation output
export type { ParsedValidationOutput } from './validation-output'
export {
  extractJsonArray,
  normalizeValidationResponse,
  parseValidationResponse
} from './validation-output'
