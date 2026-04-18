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
  ValidationLlmClient,
  ValidationLlmConfig
} from './llm'
export {
  BedrockValidationClient,
  newValidationLlmClient,
  OllamaValidationClient
} from './llm'

// Validation output
export type { ParsedValidationOutput } from './validation-output'
export {
  runDeterministicDateValidation,
  extractJsonArray,
  normalizeLlmValidationResult,
  normalizeMismatchMessage,
  normalizeValidationResponse,
  parseValidationResponse
} from './validation-output'

// Handlers
export type {
  ValidationSourceDocument,
  ValidationHandlerEvent,
  ValidationHandlerResult
} from './handlers'
export { validationHandler } from './handlers'

// Status
export type {
  ValidationPipelineStage,
  ValidationStatusArtifact
} from './status'
export {
  buildCompletedValidationStatusArtifact,
  buildFailedValidationStatusArtifact,
  buildValidationStatusArtifact,
  getValidationStatusKey
} from './status'

// Results
export type {
  ValidationLlmDiagnostic,
  ValidationRetrievalDiagnostic,
  ValidationResultArtifact
} from './results'
export {
  buildValidationResultArtifact,
  getValidationResultKey
} from './results'

// Versioning
export type { FormSnapshotField } from './versioning'
export {
  computeArtifactVersion,
  computeFormSnapshotHash
} from './versioning'

// Evaluation
export type {
  DateValidationCorpusExpectation,
  DateValidationCorpusScenario,
  DateValidationEvaluationFieldReport,
  DateValidationEvaluationScenarioReport,
  DateValidationEvaluationSummary
} from './evaluation'
export {
  DATE_VALIDATION_CORPUS,
  RECOMMENDED_DATE_VALIDATION_DEMO_SCENARIOS,
  runDateValidationEvaluation
} from './evaluation'
