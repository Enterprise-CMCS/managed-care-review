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

export function selectDiverseRetrievedChunks<T extends OrderedChunkMetadata>(
  results: RetrievedChunk<T>[],
  limit: number,
  maxPerDocument: number
): RetrievedChunk<T>[] {
  // Prefer one strong chunk per document first so broad retrieval can surface
  // evidence from multiple contracts before any single document fills the
  // whole prompt budget. After that, allow a small number of repeat chunks to
  // preserve same-document continuity when the pool is narrow.
  const selected = new Set<string>()
  const selectedResults: RetrievedChunk<T>[] = []
  const selectedPerDocument = new Map<string, number>()

  for (const result of results) {
    if (selectedResults.length >= limit) {
      break
    }

    if (selectedPerDocument.has(result.metadata.documentName)) {
      continue
    }

    selected.add(result.id)
    selectedResults.push(result)
    selectedPerDocument.set(result.metadata.documentName, 1)
  }

  for (const result of results) {
    if (selectedResults.length >= limit) {
      break
    }

    if (selected.has(result.id)) {
      continue
    }

    const currentDocumentCount =
      selectedPerDocument.get(result.metadata.documentName) ?? 0

    if (currentDocumentCount >= maxPerDocument) {
      continue
    }

    selected.add(result.id)
    selectedResults.push(result)
    selectedPerDocument.set(
      result.metadata.documentName,
      currentDocumentCount + 1
    )
  }

  return selectedResults
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
