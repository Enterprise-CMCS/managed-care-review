import type {
  VectorSearchResult,
  VectorStore,
  VectorStoreItem
} from './vectorStore'

export class BruteForceVectorStore<TMetadata = unknown> implements VectorStore<TMetadata> {
  private items: VectorStoreItem<TMetadata>[] = []

  async add(items: VectorStoreItem<TMetadata>[]): Promise<void> {
    this.items.push(...items)
  }

  async search(queryVector: number[], k: number): Promise<VectorSearchResult<TMetadata>[]> {
    if (k <= 0) {
      return []
    }

    const results = this.items.map((item) => ({
      id: item.id,
      score: cosineSimilarity(queryVector, item.vector),
      metadata: item.metadata
    }))

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
  }

  async clear(): Promise<void> {
    this.items = []
  }
}

// Brute-force search is acceptable here because the PoC dataset is small.
// We score every stored vector and then sort the results by similarity.
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector length mismatch: query has length ${a.length}, item has length ${b.length}`
    )
  }

  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  // Cosine similarity compares the angle between two vectors rather than their
  // raw size. In practice, embeddings that point in a similar direction tend to
  // represent more similar meaning.
  for (let index = 0; index < a.length; index += 1) {
    dotProduct += a[index] * b[index]
    magnitudeA += a[index] * a[index]
    magnitudeB += b[index] * b[index]
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  // Divide the dot product by both vector magnitudes so the score stays focused
  // on directional similarity instead of favoring longer vectors.
  return dotProduct / (Math.sqrt(magnitudeA * magnitudeB))
}
