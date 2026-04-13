// One stored vector plus whatever metadata calling code wants to keep beside it,
// such as chunk text or ordering information.
export interface VectorStoreItem<TMetadata = unknown> {
  id: string
  vector: number[]
  metadata: TMetadata
}

// One search result with the original metadata and a numeric similarity score.
export interface VectorSearchResult<TMetadata = unknown> {
  id: string
  score: number
  metadata: TMetadata
}

// Retrieval code should depend on this interface rather than a specific in-memory
// implementation so the store can be swapped later without rewriting callers.
export interface VectorStore<TMetadata = unknown> {
  add(items: VectorStoreItem<TMetadata>[]): Promise<void>
  search(queryVector: number[], k: number): Promise<VectorSearchResult<TMetadata>[]>
  clear?(): Promise<void>
}
