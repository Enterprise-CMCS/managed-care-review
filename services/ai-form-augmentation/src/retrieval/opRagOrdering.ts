export interface OrderedChunkMetadata {
  documentName: string
  order: number
  page: number | null
  text: string
}

export interface RetrievedChunk<TMetadata> {
  id: string
  score: number
  metadata: TMetadata
}

export function orderRetrievedChunks<T extends OrderedChunkMetadata>(
  results: RetrievedChunk<T>[]
): RetrievedChunk<T>[] {
  // Similarity search answers "what is relevant?".
  // OP-RAG then answers "in what order should the model read those results?".
  return [...results].sort((a, b) => {
    // Keep chunks grouped by their source document first so multi-document
    // retrieval stays stable and readable.
    const documentComparison = a.metadata.documentName.localeCompare(
      b.metadata.documentName
    )

    if (documentComparison !== 0) {
      return documentComparison
    }

    return a.metadata.order - b.metadata.order
  })
}
