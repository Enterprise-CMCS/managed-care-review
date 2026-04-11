export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>
  embedTexts(texts: string[]): Promise<number[][]>
  // Optional helper for logging which embedding model/provider produced the vectors.
  getModelInfo?(): string
}
